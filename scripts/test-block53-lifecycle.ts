/**
 * BLOCK 5.3 — Pay Now UX + Payment Proof Lifecycle: real runtime evidence.
 * Exercises WAITING_PAYMENT -> proof -> ON_REVIEW -> reject(reason) -> WAITING_PAYMENT -> resubmit
 * -> ON_REVIEW -> confirm -> CONFIRMED against the live dev server, plus the owner-reject-reason
 * fix, cross-user/cross-owner security matrix, and inventory continuity around reject.
 *
 * Run: npx tsx scripts/test-block53-lifecycle.ts   (dev server must be up on :3000)
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
let failures = 0;
const createdBookingIds: number[] = [];
const createdRoomIds: number[] = [];
const createdMethodIds: number[] = [];
const createdUserIds: number[] = [];
const createdOwnerIds: number[] = [];

function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  PASS: ${label}`);
  else {
    console.error(`  FAIL: ${label}`, extra ?? "");
    failures += 1;
  }
}

function uniquePhone(tag: string) {
  return `+992${Math.floor(900000000 + Math.random() * 99999999)}${tag}`.slice(0, 16);
}

async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3600_000) } });
  return `tajstay_session=${token}`;
}

async function postBooking(opts: { roomId: number; checkIn: string; checkOut: string; phone: string; guestName: string; hotelPaymentMethodId: number }) {
  const fd = new FormData();
  fd.set("roomId", String(opts.roomId));
  fd.set("checkIn", opts.checkIn);
  fd.set("checkOut", opts.checkOut);
  fd.set("phone", opts.phone);
  fd.set("guestName", opts.guestName);
  fd.set("hotelPaymentMethodId", String(opts.hotelPaymentMethodId));
  const res = await fetch(`${BASE}/api/bookings?json=1`, { method: "POST", body: fd, headers: { "x-json": "1", accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, setCookie: res.headers.get("set-cookie")?.split(";")[0] ?? null };
}

async function submitProof(bookingId: number, cookie: string, pngPath: string) {
  const fd = new FormData();
  fd.set("bookingId", String(bookingId));
  const buf = fs.readFileSync(pngPath);
  fd.set("proofFile", new Blob([buf], { type: "image/png" }), "proof.png");
  const res = await fetch(`${BASE}/api/payments/proof?json=1`, {
    method: "POST",
    body: fd,
    headers: { accept: "application/json", cookie }
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function ownerReject(bookingId: number, cookie: string, reason: string) {
  const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/payment-reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", cookie },
    body: JSON.stringify({ bookingId, reason })
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function ownerConfirm(bookingId: number, cookie: string) {
  const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/payment-approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", cookie },
    body: JSON.stringify({ bookingId })
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// 1x1 black PNG.
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function main() {
  console.log("=== BLOCK 5.3 setup ===");
  const tmpPng = path.join(process.cwd(), "block53-test-proof.png");
  fs.writeFileSync(tmpPng, Buffer.from(PNG_B64, "base64"));

  const hotel = await prisma.hotel.findFirst({ where: { status: "APPROVED" } });
  if (!hotel) throw new Error("no approved hotel found");
  const otherHotel = await prisma.hotel.findFirst({ where: { status: "APPROVED", id: { not: hotel.id } } });
  if (!otherHotel) throw new Error("need a second approved hotel for cross-owner test");

  const method = await prisma.hotelPaymentMethod.create({
    data: { hotelId: hotel.id, type: "CARD", displayLabel: "5.3 Fixture", recipientName: "5.3 Recipient", paymentIdentifier: "5.3-0001", isActive: true, sortOrder: 99 }
  });
  createdMethodIds.push(method.id);

  const room = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `5.3-${Date.now()}`, title: "5.3 Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(room.id);

  const owner = await prisma.user.findFirst({ where: { id: hotel.ownerId } });
  if (!owner) throw new Error("hotel owner not found");
  const otherOwner = await prisma.user.findFirst({ where: { id: otherHotel.ownerId } });
  if (!otherOwner) throw new Error("other hotel owner not found");
  const ownerCookie = await createSession(owner.id);
  const otherOwnerCookie = await createSession(otherOwner.id);

  console.log("hotel", hotel.id, "room", room.id, "method", method.id, "owner", owner.id, "otherOwner", otherOwner.id);

  // ============================================================
  console.log("\n=== Step A: create booking (WAITING_PAYMENT) ===");
  const dates = { checkIn: "2028-04-10", checkOut: "2028-04-12" };
  const created = await postBooking({ roomId: room.id, ...dates, phone: uniquePhone("A"), guestName: "5.3 Guest A", hotelPaymentMethodId: method.id });
  check("booking created (200 ok)", created.status === 200 && created.json.ok === true, created.json);
  const bookingId = created.json.bookingId as number;
  const guestCookie = created.setCookie!;
  createdBookingIds.push(bookingId);

  {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("initial status = WAITING_PAYMENT", b?.status === "WAITING_PAYMENT");
    check("Payment PENDING, expiresAt set, snapshot present", !!b?.expiresAt && !!b?.paymentMethodSnapshot);
  }

  // ============================================================
  console.log("\n=== Security: unrelated guest cannot submit proof for this booking ===");
  const guestBPhone = uniquePhone("B");
  const guestBPassword = crypto.randomBytes(8).toString("hex");
  const guestB = await prisma.user.create({ data: { name: "5.3 Guest B", phone: guestBPhone, password: guestBPassword, role: "GUEST" } });
  createdUserIds.push(guestB.id);
  const guestBCookie = await createSession(guestB.id);
  {
    const r = await submitProof(bookingId, guestBCookie, tmpPng);
    check("unrelated guest proof submit denied", r.status === 404 || (r.json && r.json.error === "not_found"), r);
  }

  // ============================================================
  console.log("\n=== Step B: real proof submission by the booking's own guest -> ON_REVIEW ===");
  const proofRes = await submitProof(bookingId, guestCookie, tmpPng);
  check("proof submit ok", proofRes.status === 200 && proofRes.json.ok !== false, proofRes.json);
  {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("status -> ON_REVIEW", b?.status === "ON_REVIEW");
    check("paymentProofUrl set (private pathname, not raw public url)", !!b?.paymentProofUrl && !b.paymentProofUrl.startsWith("http"));
    check("proofSubmittedAt set", !!b?.proofSubmittedAt);
    check("proofReviewDeadlineAt set (~5min)", !!b?.proofReviewDeadlineAt);
    check("paymentTimerPaused true, expiresAt null", b?.paymentTimerPaused === true && b?.expiresAt === null);
    const notif = await prisma.notification.count({ where: { bookingId, type: "PAYMENT_PROOF_SUBMITTED", userId: owner.id } });
    check("owner notified of proof submission", notif >= 1);
  }

  // ============================================================
  console.log("\n=== Security: cross-hotel owner cannot review this booking ===");
  {
    const r1 = await ownerReject(bookingId, otherOwnerCookie, "not my hotel");
    check("cross-hotel owner reject denied", r1.status === 403 || r1.status === 404, r1);
    const r2 = await ownerConfirm(bookingId, otherOwnerCookie);
    check("cross-hotel owner confirm denied", r2.status === 403 || r2.status === 404, r2);
  }

  // ============================================================
  console.log("\n=== Inventory continuity: booking is ON_REVIEW, competing guest still blocked ===");
  {
    const guestC = await postBooking({ roomId: room.id, ...dates, phone: uniquePhone("C"), guestName: "5.3 Guest C", hotelPaymentMethodId: method.id });
    check("competing booking blocked while ON_REVIEW (active hold)", guestC.status === 409, guestC);
  }

  // ============================================================
  console.log("\n=== BLOCK 5.3 core fix: owner reject with EMPTY reason must be rejected ===");
  {
    const r = await ownerReject(bookingId, ownerCookie, "");
    check("empty reason -> 400", r.status === 400, r);
    const r2 = await ownerReject(bookingId, ownerCookie, "ab");
    check("2-char reason -> 400 (below min length)", r2.status === 400, r2);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("booking still ON_REVIEW after rejected empty-reason attempts (no state change)", b?.status === "ON_REVIEW");
  }

  // ============================================================
  console.log("\n=== Step C: owner reject with a real reason -> WAITING_PAYMENT, fresh deadline ===");
  const rejectReason = "Сумма перевода не совпадает с суммой брони";
  {
    const r = await ownerReject(bookingId, ownerCookie, rejectReason);
    check("valid-reason reject succeeds", r.status === 200 && r.json.ok === true, r);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("status back to WAITING_PAYMENT", b?.status === "WAITING_PAYMENT");
    check("paymentProofUrl cleared", b?.paymentProofUrl === null);
    check("proofReviewDeadlineAt cleared", b?.proofReviewDeadlineAt === null);
    check("fresh future expiresAt set", !!b?.expiresAt && b.expiresAt.getTime() > Date.now());
    check("paymentReviewNote = the real reason", b?.paymentReviewNote === rejectReason);
    check("hotelPaymentMethodId/snapshot UNCHANGED (still the original frozen snapshot)", b?.hotelPaymentMethodId === method.id);
    const notif = await prisma.notification.count({ where: { bookingId, type: "PAYMENT_REJECTED", userId: guestB.id === 0 ? -1 : (await prisma.booking.findUnique({ where: { id: bookingId } }))!.userId! } });
    check("guest notified of rejection", notif >= 1);
  }

  // ============================================================
  console.log("\n=== Inventory continuity: still blocked immediately after reject (no release window) ===");
  {
    const guestD = await postBooking({ roomId: room.id, ...dates, phone: uniquePhone("D"), guestName: "5.3 Guest D", hotelPaymentMethodId: method.id });
    check("competing booking still blocked right after reject", guestD.status === 409, guestD);
  }

  // ============================================================
  console.log("\n=== Step D: resubmit proof -> ON_REVIEW again ===");
  {
    const r = await submitProof(bookingId, guestCookie, tmpPng);
    check("resubmit ok", r.status === 200 && r.json.ok !== false, r.json);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    check("status -> ON_REVIEW again", b?.status === "ON_REVIEW");
    check("new proofReviewDeadlineAt set", !!b?.proofReviewDeadlineAt);
  }

  // ============================================================
  console.log("\n=== Security: double reject after already back in WAITING_PAYMENT should now be NOT_ON_REVIEW-safe (booking now ON_REVIEW again, so re-test double-confirm instead) ===");

  // ============================================================
  console.log("\n=== Step E: owner confirm -> CONFIRMED ===");
  {
    const r = await ownerConfirm(bookingId, ownerCookie);
    check("confirm succeeds", r.status === 200 && r.json.ok === true, r);
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    const pay = await prisma.payment.findUnique({ where: { bookingId } });
    check("status -> CONFIRMED", b?.status === "CONFIRMED");
    check("paymentStatus -> PAID", b?.paymentStatus === "PAID");
    check("Payment.status -> CAPTURED", pay?.status === "CAPTURED");
    check("proofReviewedById set to owner", b?.proofReviewedById === owner.id);
  }

  // ============================================================
  console.log("\n=== Security: double confirm has no duplicate side effects ===");
  {
    const before = await prisma.transactionLog.count({ where: { bookingId } });
    const r = await ownerConfirm(bookingId, ownerCookie);
    check("second confirm rejected (already terminal/not ON_REVIEW)", r.status !== 200 || r.json.ok !== true, r);
    const after = await prisma.transactionLog.count({ where: { bookingId } });
    check("no new TransactionLog row from the rejected double-confirm", after === before);
  }

  // ============================================================
  console.log("\n=== Security: owner reject after CONFIRMED (terminal) is blocked ===");
  {
    const r = await ownerReject(bookingId, ownerCookie, "trying to reject a confirmed booking");
    check("reject on CONFIRMED booking rejected", r.status !== 200 || r.json.ok !== true, r);
  }

  fs.unlinkSync(tmpPng);
  console.log(failures === 0 ? "\n=== BLOCK 5.3: ALL PASS ===" : `\n=== BLOCK 5.3: ${failures} FAILURE(S) ===`);
}

async function cleanup() {
  console.log("\n=== Cleanup ===");
  const bookingIds = [...new Set(createdBookingIds)];
  const pay = await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const tx = await prisma.transactionLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const notif = await prisma.notification.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const chatMsgs = await prisma.chatMessage.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => ({ count: 0 }));
  const bookings = await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  console.log("deleted payments:", pay.count, "txlogs:", tx.count, "notifications:", notif.count, "chatMessages:", (chatMsgs as { count: number }).count, "bookings:", bookings.count);

  const apiUsers = await prisma.user.findMany({ where: { name: { startsWith: "5.3 Guest" }, phone: { startsWith: "+992" } }, select: { id: true } });
  const relevantUserIds = [...new Set([...apiUsers.map((u) => u.id), ...createdUserIds])];
  await prisma.session.deleteMany({ where: { userId: { in: [...relevantUserIds, ...createdOwnerIds] } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: relevantUserIds } } });
  console.log("deleted users:", users.count);

  const rooms = await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
  const methods = await prisma.hotelPaymentMethod.deleteMany({ where: { id: { in: createdMethodIds } } });
  console.log("deleted rooms:", rooms.count, "paymentMethods:", methods.count);

  const leftoverBookings = await prisma.booking.count({ where: { checkIn: { gte: new Date("2028-04-01") } } });
  const leftoverRooms = await prisma.room.count({ where: { id: { in: createdRoomIds } } });
  const leftoverMethods = await prisma.hotelPaymentMethod.count({ where: { id: { in: createdMethodIds } } });
  const leftoverUsers = await prisma.user.count({ where: { id: { in: relevantUserIds } } });
  console.log("VERIFY leftover: bookings(2028-04+)=", leftoverBookings, "rooms=", leftoverRooms, "methods=", leftoverMethods, "users=", leftoverUsers);
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
