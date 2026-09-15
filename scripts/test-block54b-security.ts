/**
 * BLOCK 5.4B — security/authorization matrix beyond the concurrency script: hotel-policy toggle
 * authorization, the arrival-payment action's authorization/idempotency, and cross-hotel/cross-role
 * checks. Run: npx tsx scripts/test-block54b-security.ts (dev server must be up on :3000).
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
let failures = 0;
const cleanup = { bookingIds: [] as number[], roomIds: [] as number[], hotelIds: [] as number[], userIds: [] as number[], methodIds: [] as number[] };

function check(label: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${label}`);
  else {
    console.error(`  FAIL: ${label}`);
    failures += 1;
  }
}

async function sessionFor(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3600_000) } });
  return `tajstay_session=${token}`;
}

async function main() {
  const tag = Date.now();
  const ownerA = await prisma.user.create({ data: { name: "5.4B Owner A", email: `54b-a-${tag}@t.local`, phone: `+992710${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "OWNER", verified: true } });
  const ownerB = await prisma.user.create({ data: { name: "5.4B Owner B", email: `54b-b-${tag}@t.local`, phone: `+992711${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "OWNER", verified: true } });
  const guest = await prisma.user.create({ data: { name: "5.4B Guest", email: `54b-g-${tag}@t.local`, phone: `+992712${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "GUEST", verified: true } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  cleanup.userIds.push(ownerA.id, ownerB.id, guest.id);

  const hotelA = await prisma.hotel.create({ data: { ownerId: ownerA.id, name: `54B Sec Hotel A ${tag}`, city: "D", address: "a", description: "d", propertyType: "HOTEL", status: "APPROVED", latitude: 1, longitude: 1, acceptsPayAtCheckIn: false } });
  cleanup.hotelIds.push(hotelA.id);
  const roomA = await prisma.room.create({ data: { hotelId: hotelA.id, roomTypeId: null, roomNumber: `54B-SEC-${tag}`, title: "r", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true } });
  cleanup.roomIds.push(roomA.id);

  console.log("=== 1. Owner policy toggle: cross-hotel owner denied ===");
  {
    const cookieB = await sessionFor(ownerB.id);
    const res = await fetch(`${BASE}/api/owner/hotels/${hotelA.id}/pay-at-checkin-policy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieB },
      body: JSON.stringify({ acceptsPayAtCheckIn: true })
    });
    check("cross-hotel owner toggle denied", res.status === 403 || res.status === 401);
    const h = await prisma.hotel.findUnique({ where: { id: hotelA.id }, select: { acceptsPayAtCheckIn: true } });
    check("policy unchanged", h?.acceptsPayAtCheckIn === false);
  }

  console.log("=== 2. Owner policy toggle: guest denied ===");
  {
    const cookieG = await sessionFor(guest.id);
    const res = await fetch(`${BASE}/api/owner/hotels/${hotelA.id}/pay-at-checkin-policy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieG },
      body: JSON.stringify({ acceptsPayAtCheckIn: true })
    });
    check("guest toggle denied", res.status === 403 || res.status === 401);
  }

  console.log("=== 3. Owner policy toggle: correct owner can enable ===");
  {
    const cookieA = await sessionFor(ownerA.id);
    const res = await fetch(`${BASE}/api/owner/hotels/${hotelA.id}/pay-at-checkin-policy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieA },
      body: JSON.stringify({ acceptsPayAtCheckIn: true })
    });
    check("correct owner can enable", res.status === 200);
    const h = await prisma.hotel.findUnique({ where: { id: hotelA.id }, select: { acceptsPayAtCheckIn: true } });
    check("policy now true", h?.acceptsPayAtCheckIn === true);
  }

  console.log("=== Setup: one PAY_AT_CHECK_IN booking on hotel A (now enabled) ===");
  let bookingId = 0;
  {
    const fd = new FormData();
    fd.set("roomId", String(roomA.id));
    fd.set("checkIn", "2029-06-01");
    fd.set("checkOut", "2029-06-03");
    fd.set("phone", guest.phone!);
    fd.set("guestName", "5.4B Guest");
    fd.set("paymentOption", "PAY_AT_CHECK_IN");
    const cookieG = await sessionFor(guest.id);
    const res = await fetch(`${BASE}/api/bookings?json=1`, { method: "POST", body: fd, headers: { "x-json": "1", accept: "application/json", cookie: cookieG } });
    const json = await res.json();
    check("booking created", res.status === 200 && json.ok === true);
    bookingId = json.bookingId;
    if (bookingId) cleanup.bookingIds.push(bookingId);
  }

  console.log("=== 4. Arrival-payment action: cross-hotel owner denied ===");
  {
    const cookieB = await sessionFor(ownerB.id);
    const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/confirm-arrival-payment`, { method: "POST", headers: { cookie: cookieB } });
    check("cross-hotel owner denied", res.status === 404 || res.status === 403);
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true, paymentStatus: true } });
    check("booking state unchanged", b?.status === "CONFIRMED" && b?.paymentStatus === "PENDING");
  }

  console.log("=== 5. Arrival-payment action: guest cannot call it ===");
  {
    const cookieG = await sessionFor(guest.id);
    const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/confirm-arrival-payment`, { method: "POST", headers: { cookie: cookieG } });
    check("guest denied (not an owner)", res.status === 401 || res.status === 403 || res.status === 404);
  }

  console.log("=== 6. Arrival-payment action: too early (before check-in day) denied ===");
  {
    const cookieA = await sessionFor(ownerA.id);
    const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/confirm-arrival-payment`, { method: "POST", headers: { cookie: cookieA } });
    const json = await res.json().catch(() => ({}));
    check("too_early denied (booking check-in is 2029, not today)", res.status === 400 && json.error === "too_early");
  }

  console.log("=== 7. Existing check-in route rejects a payOnArrival booking (must use arrival action) ===");
  {
    const cookieA = await sessionFor(ownerA.id);
    const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/check-in`, { method: "POST", headers: { cookie: cookieA } });
    check("plain check-in route rejects payOnArrival booking", res.status === 400);
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true, paymentStatus: true } });
    check("booking unaffected", b?.status === "CONFIRMED" && b?.paymentStatus === "PENDING");
  }

  console.log("=== 8. Correct owner CAN call arrival action once check-in day is simulated ===");
  {
    // Move the booking's checkIn to today so the same-day gate passes, then call for real.
    await prisma.booking.update({ where: { id: bookingId }, data: { checkIn: new Date() } });
    const cookieA = await sessionFor(ownerA.id);
    const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/confirm-arrival-payment`, { method: "POST", headers: { cookie: cookieA } });
    check("correct owner succeeds on check-in day", res.status === 200);
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true, paymentStatus: true } });
    check("status CHECKED_IN", b?.status === "CHECKED_IN");
    check("paymentStatus PAID", b?.paymentStatus === "PAID");
    const paymentCount = await prisma.payment.count({ where: { bookingId } });
    check("still no Payment row created", paymentCount === 0);
    const txLog = await prisma.transactionLog.findFirst({ where: { bookingId, type: "ARRIVAL_PAYMENT_CONFIRMED" } });
    check("TransactionLog recorded", Boolean(txLog));
  }

  console.log("=== 9. Double arrival action: second call is a controlled no-op, no duplicate side effects ===");
  {
    const cookieA = await sessionFor(ownerA.id);
    const res = await fetch(`${BASE}/api/owner/bookings/${bookingId}/confirm-arrival-payment`, { method: "POST", headers: { cookie: cookieA } });
    const json = await res.json().catch(() => ({}));
    check("second call is a controlled success (alreadyDone), not an error", res.status === 200 && json.alreadyDone === true);
    const txLogCount = await prisma.transactionLog.count({ where: { bookingId, type: "ARRIVAL_PAYMENT_CONFIRMED" } });
    check("still exactly 1 ARRIVAL_PAYMENT_CONFIRMED log (no duplicate)", txLogCount === 1);
  }

  console.log("=== 10. Completion: no-payout branch for a payOnArrival booking ===");
  {
    if (!admin) throw new Error("no admin user found for completion test");
    // BLOCK V1 fix: this script predates BLOCK 5.5B's P1-4 fix, which added a checkoutReached()
    // requirement to the pay-at-check-in completion branch too (a stay in progress must not be
    // closeable early). The booking's checkOut was still the original far-future fixture date
    // (2029-06-03), so completion was correctly being blocked by the newer, stricter gate - a
    // confirmed non-regression, not a real failure (see BLOCK_DB_RECOVERY_REPORT.md §11). Move
    // checkOut into the past here, exactly like checkIn was already simulated for item 8, so this
    // test again has an unambiguous PASS/FAIL meaning under the current contract.
    await prisma.booking.update({
      where: { id: bookingId },
      data: { checkIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), checkOut: new Date(Date.now() - 60 * 60 * 1000) }
    });
    const cookieAdmin = await sessionFor(admin.id);
    const fd = new FormData();
    fd.set("id", String(bookingId));
    const res = await fetch(`${BASE}/api/admin/bookings/complete`, { method: "POST", body: fd, headers: { cookie: cookieAdmin }, redirect: "manual" });
    check("completion request processed (redirect)", res.status === 307 || res.status === 302 || res.status === 200);
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
    check("status COMPLETED", b?.status === "COMPLETED");
    const payoutCount = await prisma.payout.count({ where: { bookingId } });
    check("NO Payout row created (critical gate)", payoutCount === 0);
    const noPayoutLog = await prisma.transactionLog.findFirst({ where: { bookingId, type: "PAY_AT_CHECKIN_COMPLETED_NO_PAYOUT" } });
    check("distinct no-payout TransactionLog recorded", Boolean(noPayoutLog));
    const escrowLog = await prisma.transactionLog.findFirst({ where: { bookingId, type: "ESCROW_RELEASED_PAYOUT_CREATED" } });
    check("no escrow-release log for this booking", !escrowLog);
  }

  console.log(failures === 0 ? "\n=== BLOCK 5.4B SECURITY: ALL PASS ===" : `\n=== BLOCK 5.4B SECURITY: ${failures} FAILURE(S) ===`);
}

async function cleanupAll() {
  console.log("\n=== Cleanup ===");
  await prisma.payout.deleteMany({ where: { bookingId: { in: cleanup.bookingIds } } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: cleanup.bookingIds } } });
  await prisma.transactionLog.deleteMany({ where: { bookingId: { in: cleanup.bookingIds } } });
  await prisma.notification.deleteMany({ where: { bookingId: { in: cleanup.bookingIds } } });
  const bookings = await prisma.booking.deleteMany({ where: { id: { in: cleanup.bookingIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: cleanup.userIds } } });
  const rooms = await prisma.room.deleteMany({ where: { id: { in: cleanup.roomIds } } });
  const hotels = await prisma.hotel.deleteMany({ where: { id: { in: cleanup.hotelIds } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
  console.log("deleted:", { bookings: bookings.count, rooms: rooms.count, hotels: hotels.count, users: users.count });
  const leftoverHotels = await prisma.hotel.count({ where: { id: { in: cleanup.hotelIds } } });
  console.log("VERIFY leftover hotels:", leftoverHotels);
}

main()
  .then(() => cleanupAll())
  .then(() => prisma.$disconnect())
  .then(() => process.exit(failures === 0 ? 0 : 1))
  .catch(async (e) => {
    console.error("FATAL:", e);
    await cleanupAll().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(1);
  });
