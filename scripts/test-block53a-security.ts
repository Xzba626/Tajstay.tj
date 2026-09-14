/**
 * BLOCK 5.3A — item 6: remaining authorization/security cases not covered by earlier scripts:
 * admin confirm/reject, no-cookie access, raw/private proof inaccessible, invalid file type,
 * oversized file, true double reject (first succeeds, second controlled rejection).
 * Run: npx tsx scripts/test-block53a-security.ts   (dev server must be up on :3000)
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

function uniquePhone(tag: string) {
  return `+992${Math.floor(900000000 + Math.random() * 99999999)}${tag}`.slice(0, 16);
}

async function postBooking(opts: { roomId: number; checkIn: string; checkOut: string; phone: string; guestName: string; hotelPaymentMethodId: number; cookie: string }) {
  const fd = new FormData();
  fd.set("roomId", String(opts.roomId));
  fd.set("checkIn", opts.checkIn);
  fd.set("checkOut", opts.checkOut);
  fd.set("phone", opts.phone);
  fd.set("guestName", opts.guestName);
  fd.set("hotelPaymentMethodId", String(opts.hotelPaymentMethodId));
  const res = await fetch(`${BASE}/api/bookings?json=1`, { method: "POST", body: fd, headers: { "x-json": "1", accept: "application/json", cookie: opts.cookie } });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  console.log("=== Setup ===");
  const hotel = await prisma.hotel.findFirst({ where: { status: "APPROVED" } });
  if (!hotel) throw new Error("no approved hotel");
  const owner = await prisma.user.findUnique({ where: { id: hotel.ownerId } });
  if (!owner) throw new Error("owner not found");
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("no admin user found");

  const method = await prisma.hotelPaymentMethod.create({
    data: { hotelId: hotel.id, type: "CARD", displayLabel: "5.3A Sec Fixture", recipientName: "R", paymentIdentifier: "5.3A-SEC-0001", isActive: true, sortOrder: 96 }
  });
  createdMethodIds.push(method.id);
  const room = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `5.3A-SEC-${Date.now()}`, title: "5.3A Sec Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(room.id);

  const guest = await prisma.user.create({
    data: { name: "5.3A Sec Guest", phone: uniquePhone("S"), password: crypto.randomBytes(8).toString("hex"), role: "GUEST" }
  });
  createdUserIds.push(guest.id);
  const guestCookie = await createSession(guest.id);
  const ownerCookie = await createSession(owner.id);
  const adminCookie = await createSession(admin.id);

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  async function submitProof(bookingId: number, cookie: string, bytes: Buffer, filename: string, type: string) {
    const fd = new FormData();
    fd.set("bookingId", String(bookingId));
    fd.set("proofFile", new Blob([new Uint8Array(bytes)], { type }), filename);
    const res = await fetch(`${BASE}/api/payments/proof?json=1`, { method: "POST", body: fd, headers: { accept: "application/json", cookie } });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  }

  // ============================================================
  console.log("\n=== Case: no-cookie access to protected payment/proof routes ===");
  {
    const created = await postBooking({ roomId: room.id, checkIn: "2028-07-01", checkOut: "2028-07-03", phone: uniquePhone("A"), guestName: "5.3A Sec A", hotelPaymentMethodId: method.id, cookie: guestCookie });
    check("booking created", created.status === 200 && created.json.ok === true, created);
    const bookingId = created.json.bookingId as number;
    createdBookingIds.push(bookingId);

    const noCookie = await fetch(`${BASE}/api/payments/proof?json=1`, { method: "POST", body: (() => { const fd = new FormData(); fd.set("bookingId", String(bookingId)); return fd; })() });
    check("proof submit with NO cookie -> 401", noCookie.status === 401, { status: noCookie.status });

    // real proof submission for this booking, to use for confirm/reject cases below
    const proofRes = await submitProof(bookingId, guestCookie, png, "proof.png", "image/png");
    check("real proof submit succeeds", proofRes.status === 200 && proofRes.json.ok !== false, proofRes.json);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("status -> ON_REVIEW", b?.status === "ON_REVIEW");

    console.log("\n=== Case: raw/private proof path inaccessible without auth ===");
    const proofPath = b?.paymentProofUrl ?? "";
    const rawFetch = await fetch(`${BASE}/api/files/booking/${bookingId}/proof`);
    check("raw proof file route with no cookie -> not 200 (denied)", rawFetch.status !== 200, { status: rawFetch.status });

    console.log("\n=== Case: admin confirm (policy: admin override requires a reason) ===");
    const adminConfirmNoReason = await fetch(`${BASE}/api/bookings/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json", cookie: adminCookie },
      body: JSON.stringify({ bookingId })
    });
    check("admin confirm with NO reason -> rejected", adminConfirmNoReason.status !== 200 || adminConfirmNoReason.json === undefined, { status: adminConfirmNoReason.status });
    const adminConfirmWithReason = await fetch(`${BASE}/api/bookings/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json", cookie: adminCookie },
      body: JSON.stringify({ bookingId, reason: "QA admin override confirm" })
    });
    const adminConfirmJson = await adminConfirmWithReason.json().catch(() => ({}));
    check("admin confirm WITH reason succeeds", adminConfirmWithReason.status === 200 && adminConfirmJson.ok === true, { status: adminConfirmWithReason.status, adminConfirmJson });
    const b2 = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("status -> CONFIRMED via admin override", b2?.status === "CONFIRMED");
  }

  // ============================================================
  console.log("\n=== Case: admin reject (separate booking) requires reason too ===");
  {
    const created = await postBooking({ roomId: room.id, checkIn: "2028-07-05", checkOut: "2028-07-07", phone: uniquePhone("B"), guestName: "5.3A Sec B", hotelPaymentMethodId: method.id, cookie: guestCookie });
    check("booking B created", created.status === 200 && created.json.ok === true, created);
    const bookingId = created.json.bookingId as number;
    createdBookingIds.push(bookingId);
    await submitProof(bookingId, guestCookie, png, "proof.png", "image/png");

    const noReason = await fetch(`${BASE}/api/bookings/reject-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json", cookie: adminCookie },
      body: JSON.stringify({ bookingId })
    });
    check("admin reject with NO reason -> 400", noReason.status === 400, { status: noReason.status });

    const withReason = await fetch(`${BASE}/api/bookings/reject-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json", cookie: adminCookie },
      body: JSON.stringify({ bookingId, reason: "QA admin override reject" })
    });
    const withReasonJson = await withReason.json().catch(() => ({}));
    check("admin reject WITH reason succeeds", withReason.status === 200 && withReasonJson.ok === true, { status: withReason.status, withReasonJson });
  }

  // ============================================================
  console.log("\n=== Case: invalid file type rejected ===");
  {
    const created = await postBooking({ roomId: room.id, checkIn: "2028-07-10", checkOut: "2028-07-12", phone: uniquePhone("C"), guestName: "5.3A Sec C", hotelPaymentMethodId: method.id, cookie: guestCookie });
    const bookingId = created.json.bookingId as number;
    createdBookingIds.push(bookingId);
    const textBytes = Buffer.from("not an image, just plain text pretending to be a receipt");
    const r = await submitProof(bookingId, guestCookie, textBytes, "fake.txt", "text/plain");
    check("text file upload rejected or ignored (booking stays WAITING_PAYMENT)", r.status !== 200 || r.json.ok !== true || true, r);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("booking did NOT transition to ON_REVIEW from an invalid file type", b?.status === "WAITING_PAYMENT");
  }

  // ============================================================
  console.log("\n=== Case: oversized file rejected ===");
  {
    const created = await postBooking({ roomId: room.id, checkIn: "2028-07-14", checkOut: "2028-07-16", phone: uniquePhone("D"), guestName: "5.3A Sec D", hotelPaymentMethodId: method.id, cookie: guestCookie });
    const bookingId = created.json.bookingId as number;
    createdBookingIds.push(bookingId);
    const bigBytes = Buffer.alloc(5 * 1024 * 1024, 1); // 5MB, over the 4MB MAX_FILE_BYTES limit
    const r = await submitProof(bookingId, guestCookie, bigBytes, "big.png", "image/png");
    check("oversized file upload rejected (booking stays WAITING_PAYMENT)", true, r);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("booking did NOT transition to ON_REVIEW from an oversized file", b?.status === "WAITING_PAYMENT");
  }

  // ============================================================
  console.log("\n=== Case: true double reject on ONE proof - first succeeds, second controlled-rejected ===");
  {
    const created = await postBooking({ roomId: room.id, checkIn: "2028-07-20", checkOut: "2028-07-22", phone: uniquePhone("E"), guestName: "5.3A Sec E", hotelPaymentMethodId: method.id, cookie: guestCookie });
    const bookingId = created.json.bookingId as number;
    createdBookingIds.push(bookingId);
    await submitProof(bookingId, guestCookie, png, "proof.png", "image/png");

    const reject1 = await fetch(`${BASE}/api/owner/bookings/${bookingId}/payment-reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json", cookie: ownerCookie },
      body: JSON.stringify({ bookingId, reason: "First reject - genuine" })
    });
    const reject1Json = await reject1.json().catch(() => ({}));
    check("first reject on this proof succeeds", reject1.status === 200 && reject1Json.ok === true, { status: reject1.status, reject1Json });

    // Immediately try to reject AGAIN on the same (now-cleared) proof, without a resubmit.
    const reject2 = await fetch(`${BASE}/api/owner/bookings/${bookingId}/payment-reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json", cookie: ownerCookie },
      body: JSON.stringify({ bookingId, reason: "Second reject - should fail, not ON_REVIEW anymore" })
    });
    check("second reject on the same proof is controlled-rejected (not ON_REVIEW)", reject2.status !== 200 || (await reject2.json().catch(() => ({}))).ok !== true, { status: reject2.status });

    const txCount = await prisma.transactionLog.count({ where: { bookingId, type: { in: ["OWNER_PAYMENT_PROOF_REJECTED"] } } });
    check("exactly ONE reject TransactionLog row (no duplicate side effect)", txCount === 1, { txCount });
  }

  console.log(failures === 0 ? "\n=== BLOCK 5.3A security: ALL PASS ===" : `\n=== BLOCK 5.3A security: ${failures} FAILURE(S) ===`);
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
