/**
 * BLOCK 5.5A.1 §2 — targeted runtime proof: can an admin complete a Pay Now booking that was
 * NEVER checked in, and/or before its checkOut date has passed, creating a Payout either way?
 * Uses real HTTP against POST /api/admin/bookings/complete - the exact route under scrutiny.
 * The path TO CONFIRMED+PAID+CAPTURED is constructed directly in DB (already proven correct by
 * BLOCK 5.3/5.3A's own runtime tests) so this script isolates exactly the completion step itself.
 *
 * Run: npx tsx scripts/test-block55a1-completion-safety.ts (dev server must be up on :3000)
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

async function makeConfirmedPaidBooking(opts: { hotelId: number; roomId: number; guestId: number; checkIn: Date; checkOut: Date; tag: string }) {
  const method = await prisma.hotelPaymentMethod.create({
    data: { hotelId: opts.hotelId, type: "CARD", displayLabel: `55A1 ${opts.tag}`, recipientName: "R", paymentIdentifier: "ID", isActive: true }
  });
  cleanup.methodIds.push(method.id);
  const booking = await prisma.booking.create({
    data: {
      publicCode: `TJ55A1${opts.tag}${Date.now()}`,
      userId: opts.guestId,
      roomId: opts.roomId,
      assignedRoomId: opts.roomId,
      checkIn: opts.checkIn,
      checkOut: opts.checkOut,
      totalPrice: 500,
      commission: 50,
      subtotal: 450,
      serviceFee: 0,
      taxAmount: 0,
      currency: "TJS",
      paymentStatus: "PAID",
      paymentMethod: method.displayLabel,
      hotelPaymentMethodId: method.id,
      paymentMethodSnapshot: { displayLabel: method.displayLabel, recipientName: "R", paymentIdentifier: "ID", instructions: null },
      payOnArrival: false,
      phone: "+992700000000",
      status: "CONFIRMED"
    }
  });
  cleanup.bookingIds.push(booking.id);
  const payment = await prisma.payment.create({
    data: { bookingId: booking.id, userId: opts.guestId, provider: "MANUAL", method: method.displayLabel, status: "CAPTURED", currency: "TJS", amount: 500 }
  });
  return { booking, payment };
}

async function main() {
  const tag = Date.now();
  const owner = await prisma.user.create({ data: { name: "55A1 Owner", email: `55a1-o-${tag}@t.local`, phone: `+992740${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "OWNER", verified: true } });
  const guest = await prisma.user.create({ data: { name: "55A1 Guest", email: `55a1-g-${tag}@t.local`, phone: `+992741${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "GUEST", verified: true } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("no admin user found in DB");
  cleanup.userIds.push(owner.id, guest.id);

  const hotel = await prisma.hotel.create({ data: { ownerId: owner.id, name: `55A1 Hotel ${tag}`, city: "D", address: "a", description: "d", propertyType: "HOTEL", status: "APPROVED", latitude: 1, longitude: 1 } });
  cleanup.hotelIds.push(hotel.id);
  const roomA = await prisma.room.create({ data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `55A1-A-${tag}`, title: "r", price: 500, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true } });
  const roomB = await prisma.room.create({ data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `55A1-B-${tag}`, title: "r", price: 500, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true } });
  cleanup.roomIds.push(roomA.id, roomB.id);

  const cookieAdmin = await sessionFor(admin.id);

  console.log("=== Scenario A: CONFIRMED+PAID+CAPTURED, NEVER checked in -> admin complete ===");
  {
    const { booking } = await makeConfirmedPaidBooking({
      hotelId: hotel.id, roomId: roomA.id, guestId: guest.id, tag: "A",
      checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-03") // fully in the past, never checked in
    });
    const before = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
    check("before: status is CONFIRMED (not CHECKED_IN)", before?.status === "CONFIRMED");

    const fd = new FormData();
    fd.set("id", String(booking.id));
    const res = await fetch(`${BASE}/api/admin/bookings/complete`, { method: "POST", body: fd, headers: { cookie: cookieAdmin }, redirect: "manual" });
    const after = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
    const payoutCount = await prisma.payout.count({ where: { bookingId: booking.id } });
    console.log(`  HTTP status: ${res.status}, redirect location: ${res.headers.get("location")}`);
    console.log(`  after DB: status=${after?.status}, payoutCount=${payoutCount}`);
    check("Scenario A: admin COULD complete a never-checked-in booking (confirms the defect)", after?.status === "COMPLETED");
    check("Scenario A: a Payout WAS created for it (confirms financial exposure)", payoutCount === 1);
  }

  console.log("\n=== Scenario B: CHECKED_IN, but checkOut date is in the FUTURE -> admin complete ===");
  {
    const futureCheckOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const { booking } = await makeConfirmedPaidBooking({
      hotelId: hotel.id, roomId: roomB.id, guestId: guest.id, tag: "B",
      checkIn: new Date(), checkOut: futureCheckOut
    });
    // Simulate a real check-in (owner action already proven elsewhere) by writing CHECKED_IN directly -
    // this mirrors exactly what owner/bookings/[id]/check-in/route.ts itself writes on success.
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_IN" } });
    const before = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true, checkOut: true } });
    check("before: status is CHECKED_IN", before?.status === "CHECKED_IN");
    check("before: checkOut is genuinely in the future", (before?.checkOut?.getTime() ?? 0) > Date.now());

    const fd = new FormData();
    fd.set("id", String(booking.id));
    const res = await fetch(`${BASE}/api/admin/bookings/complete`, { method: "POST", body: fd, headers: { cookie: cookieAdmin }, redirect: "manual" });
    const after = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
    const payoutCount = await prisma.payout.count({ where: { bookingId: booking.id } });
    console.log(`  HTTP status: ${res.status}, redirect location: ${res.headers.get("location")}`);
    console.log(`  after DB: status=${after?.status}, payoutCount=${payoutCount}`);
    check("Scenario B: admin COULD complete a booking before its checkOut date (confirms the defect)", after?.status === "COMPLETED");
    check("Scenario B: a Payout WAS created for it (confirms financial exposure)", payoutCount === 1);
  }

  console.log(failures === 0 ? "\n=== BLOCK 5.5A.1 §2: ALL EXPECTED-DEFECT ASSERTIONS CONFIRMED ===" : `\n=== BLOCK 5.5A.1 §2: ${failures} assertion(s) did NOT match expectation ===`);
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
  const methods = await prisma.hotelPaymentMethod.deleteMany({ where: { id: { in: cleanup.methodIds } } });
  const hotels = await prisma.hotel.deleteMany({ where: { id: { in: cleanup.hotelIds } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
  console.log("deleted:", { bookings: bookings.count, rooms: rooms.count, methods: methods.count, hotels: hotels.count, users: users.count });
  const leftoverHotels = await prisma.hotel.count({ where: { id: { in: cleanup.hotelIds } } });
  console.log("VERIFY leftover hotels:", leftoverHotels);
}

main()
  .then(() => cleanupAll())
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error("FATAL:", e);
    await cleanupAll().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(1);
  });
