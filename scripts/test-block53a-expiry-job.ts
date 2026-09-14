/**
 * BLOCK 5.3A — items 4 & 5: expired-proof-submission rejection, and the local expire/review job,
 * exercised for real (not just read). Uses disposable fixtures created inline, deleted after.
 * Run: npx tsx scripts/test-block53a-expiry-job.ts   (dev server must be up on :3000, JOB_SECRET set)
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
let failures = 0;
const createdBookingIds: number[] = [];
const createdUserIds: number[] = [];
const createdRoomIds: number[] = [];
const createdMethodIds: number[] = [];

function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  PASS: ${label}`);
  else {
    console.error(`  FAIL: ${label}`, extra ?? "");
    failures += 1;
  }
}

async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3600_000) } });
  return `tajstay_session=${token}`;
}

async function main() {
  console.log("=== Setup ===");
  const hotel = await prisma.hotel.findFirst({ where: { status: "APPROVED" } });
  if (!hotel) throw new Error("no approved hotel");
  const owner = await prisma.user.findUnique({ where: { id: hotel.ownerId } });
  if (!owner) throw new Error("owner not found");

  const method = await prisma.hotelPaymentMethod.create({
    data: { hotelId: hotel.id, type: "CARD", displayLabel: "5.3A Job Fixture", recipientName: "R", paymentIdentifier: "5.3A-JOB-0001", isActive: true, sortOrder: 97 }
  });
  createdMethodIds.push(method.id);
  const room = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `5.3A-JOB-${Date.now()}`, title: "5.3A Job Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(room.id);

  const secret = process.env.JOB_SECRET || "";
  console.log("JOB_SECRET configured:", secret.length > 0);

  // ============================================================
  console.log("\n=== Item 4: expired WAITING_PAYMENT rejects a real proof POST ===");
  {
    const guest = await prisma.user.create({
      data: { name: "5.3A Expired Guest", phone: `+992702${String(Date.now()).slice(-6)}`, password: crypto.randomBytes(8).toString("hex"), role: "GUEST" }
    });
    createdUserIds.push(guest.id);
    const cookie = await createSession(guest.id);
    const booking = await prisma.booking.create({
      data: {
        publicCode: `TJEXP${Date.now()}`,
        userId: guest.id,
        roomId: room.id,
        assignedRoomId: room.id,
        checkIn: new Date("2028-06-01T00:00:00.000Z"),
        checkOut: new Date("2028-06-03T00:00:00.000Z"),
        totalPrice: 200,
        commission: 0,
        subtotal: 200,
        serviceFee: 0,
        taxAmount: 0,
        currency: "TJS",
        paymentStatus: "PENDING",
        paymentMethod: "TEST",
        hotelPaymentMethodId: method.id,
        paymentMethodSnapshot: { displayLabel: "x", recipientName: "x", paymentIdentifier: "x", instructions: null },
        payOnArrival: false,
        phone: guest.phone!,
        status: "WAITING_PAYMENT",
        expiresAt: new Date(Date.now() - 5 * 60 * 1000) // already 5 min expired
      }
    });
    createdBookingIds.push(booking.id);

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const fd = new FormData();
    fd.set("bookingId", String(booking.id));
    fd.set("proofFile", new Blob([png], { type: "image/png" }), "proof.png");
    const res = await fetch(`${BASE}/api/payments/proof?json=1`, { method: "POST", body: fd, headers: { accept: "application/json", cookie } });
    const json = await res.json().catch(() => ({}));
    check("expired-booking proof POST rejected (400)", res.status === 400 && json.error === "expired", { status: res.status, json });

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    check("booking transitioned to authoritative EXPIRED", after?.status === "EXPIRED");
    check("no active proof state (paymentProofUrl still null)", after?.paymentProofUrl === null);
    check("not left in an inventory-holding state (status != WAITING_PAYMENT/ON_REVIEW)", after?.status !== "WAITING_PAYMENT" && after?.status !== "ON_REVIEW");
  }

  // ============================================================
  console.log("\n=== Item 5: local expire/review job ===");
  {
    console.log("-- secret gate --");
    const rNoSecret = await fetch(`${BASE}/api/jobs/expire-bookings`, { method: "POST" });
    check("no secret -> denied", rNoSecret.status === 401 || rNoSecret.status === 403 || rNoSecret.status === 503, { status: rNoSecret.status });
    const rBadSecret = await fetch(`${BASE}/api/jobs/expire-bookings?secret=wrong-secret-value`, { method: "POST" });
    check("wrong secret -> denied", rBadSecret.status === 401 || rBadSecret.status === 403 || rBadSecret.status === 503, { status: rBadSecret.status });

    if (!secret) {
      console.log("  SKIP: JOB_SECRET not set in this environment - cannot prove the authorized-secret path. Recorded as a gap, not a false PASS.");
    } else {
      console.log("-- scenario A: expired WAITING_PAYMENT -> EXPIRED --");
      const guestA = await prisma.user.create({
        data: { name: "5.3A JobA Guest", phone: `+992703${String(Date.now()).slice(-6)}`, password: crypto.randomBytes(8).toString("hex"), role: "GUEST" }
      });
      createdUserIds.push(guestA.id);
      const bookingA = await prisma.booking.create({
        data: {
          publicCode: `TJJOBA${Date.now()}`,
          userId: guestA.id,
          roomId: room.id,
          assignedRoomId: room.id,
          checkIn: new Date("2028-06-10T00:00:00.000Z"),
          checkOut: new Date("2028-06-12T00:00:00.000Z"),
          totalPrice: 200,
          commission: 0,
          subtotal: 200,
          serviceFee: 0,
          taxAmount: 0,
          currency: "TJS",
          paymentStatus: "PENDING",
          paymentMethod: "TEST",
          payOnArrival: false,
          phone: guestA.phone!,
          status: "WAITING_PAYMENT",
          expiresAt: new Date(Date.now() - 10 * 60 * 1000)
        }
      });
      createdBookingIds.push(bookingA.id);

      console.log("-- scenario B: ON_REVIEW past proofReviewDeadlineAt -> REJECTED --");
      const guestB = await prisma.user.create({
        data: { name: "5.3A JobB Guest", phone: `+992704${String(Date.now()).slice(-6)}`, password: crypto.randomBytes(8).toString("hex"), role: "GUEST" }
      });
      createdUserIds.push(guestB.id);
      const bookingB = await prisma.booking.create({
        data: {
          publicCode: `TJJOBB${Date.now()}`,
          userId: guestB.id,
          roomId: room.id,
          assignedRoomId: room.id,
          checkIn: new Date("2028-06-15T00:00:00.000Z"),
          checkOut: new Date("2028-06-17T00:00:00.000Z"),
          totalPrice: 200,
          commission: 0,
          subtotal: 200,
          serviceFee: 0,
          taxAmount: 0,
          currency: "TJS",
          paymentStatus: "PENDING",
          paymentMethod: "TEST",
          paymentProofUrl: "payment-proofs/fake-for-job-test.png",
          proofSubmittedAt: new Date(Date.now() - 20 * 60 * 1000),
          proofReviewDeadlineAt: new Date(Date.now() - 10 * 60 * 1000),
          paymentTimerPaused: true,
          payOnArrival: false,
          phone: guestB.phone!,
          status: "ON_REVIEW"
        }
      });
      createdBookingIds.push(bookingB.id);

      const jobRes1 = await fetch(`${BASE}/api/jobs/expire-bookings?secret=${encodeURIComponent(secret)}`, { method: "POST" });
      const jobJson1 = await jobRes1.json().catch(() => ({}));
      check("job run with correct secret succeeds", jobRes1.status === 200, { status: jobRes1.status, jobJson1 });

      const afterA = await prisma.booking.findUnique({ where: { id: bookingA.id } });
      check("scenario A: WAITING_PAYMENT -> EXPIRED", afterA?.status === "EXPIRED");
      const afterB = await prisma.booking.findUnique({ where: { id: bookingB.id } });
      check("scenario B: ON_REVIEW past deadline -> REJECTED (current policy, not changed)", afterB?.status === "REJECTED");

      const txCountAfterFirst = await prisma.transactionLog.count({ where: { bookingId: { in: [bookingA.id, bookingB.id] } } });
      const notifCountAfterFirst = await prisma.notification.count({ where: { bookingId: { in: [bookingA.id, bookingB.id] } } });

      console.log("-- repeated job run: idempotency --");
      const jobRes2 = await fetch(`${BASE}/api/jobs/expire-bookings?secret=${encodeURIComponent(secret)}`, { method: "POST" });
      check("second job run also succeeds (200)", jobRes2.status === 200, { status: jobRes2.status });
      const txCountAfterSecond = await prisma.transactionLog.count({ where: { bookingId: { in: [bookingA.id, bookingB.id] } } });
      const notifCountAfterSecond = await prisma.notification.count({ where: { bookingId: { in: [bookingA.id, bookingB.id] } } });
      check("no duplicate TransactionLog rows from repeat run", txCountAfterSecond === txCountAfterFirst, { txCountAfterFirst, txCountAfterSecond });
      check("no duplicate Notification rows from repeat run", notifCountAfterSecond === notifCountAfterFirst, { notifCountAfterFirst, notifCountAfterSecond });
    }
  }

  console.log(failures === 0 ? "\n=== BLOCK 5.3A expiry/job: ALL PASS ===" : `\n=== BLOCK 5.3A expiry/job: ${failures} FAILURE(S) ===`);
}

async function cleanup() {
  console.log("\n=== Cleanup ===");
  const bookingIds = [...new Set(createdBookingIds)];
  const pay = await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const tx = await prisma.transactionLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const notif = await prisma.notification.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const chat = await prisma.chatMessage.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => ({ count: 0 }));
  const bookings = await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  console.log("deleted payments:", pay.count, "tx:", tx.count, "notif:", notif.count, "chat:", (chat as { count: number }).count, "bookings:", bookings.count);

  const userIds = [...new Set(createdUserIds)];
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log("deleted users:", users.count);

  const rooms = await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
  const methods = await prisma.hotelPaymentMethod.deleteMany({ where: { id: { in: createdMethodIds } } });
  console.log("deleted rooms:", rooms.count, "methods:", methods.count);

  const leftoverBookings = await prisma.booking.count({ where: { id: { in: bookingIds } } });
  const leftoverUsers = await prisma.user.count({ where: { id: { in: userIds } } });
  console.log("VERIFY leftover: bookings=", leftoverBookings, "users=", leftoverUsers);
}

main()
  .then(() => cleanup())
  .then(() => prisma.$disconnect())
  .then(() => process.exit(failures === 0 ? 0 : 1))
  .catch(async (e) => {
    console.error("FATAL:", e);
    await cleanup().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(1);
  });
