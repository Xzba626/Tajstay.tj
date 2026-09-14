/**
 * BLOCK 5.4B — real concurrent HTTP requests proving PAY_AT_CHECK_IN doesn't reopen any inventory
 * hole BLOCK 4.x/5.2 already closed, plus the mixed PAY_NOW/PAY_AT_CHECK_IN interactions and the
 * idempotency same-option/different-option rules from BLOCK 5.4B §10/§25.
 *
 * Run: npx tsx scripts/test-block54b-concurrency.ts   (dev server must be up on :3000)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
let failures = 0;
const createdBookingIds: number[] = [];
const createdRoomIds: number[] = [];
const createdRoomTypeIds: number[] = [];
const createdMethodIds: number[] = [];
const createdHotelIds: number[] = [];
const createdUserNamePrefix = "B54B";

function check(label: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${label}`);
  else {
    console.error(`  FAIL: ${label}`);
    failures += 1;
  }
}

function uniquePhone(tag: string) {
  return `+992${Math.floor(900000000 + Math.random() * 99999999)}${tag}`.slice(0, 16);
}

async function postBooking(opts: {
  roomId?: number;
  roomTypeId?: number;
  checkIn: string;
  checkOut: string;
  phone: string;
  guestName: string;
  paymentOption: "PAY_NOW" | "PAY_AT_CHECK_IN";
  hotelPaymentMethodId?: number;
  cookie?: string;
}) {
  const fd = new FormData();
  if (opts.roomId) fd.set("roomId", String(opts.roomId));
  if (opts.roomTypeId) fd.set("roomTypeId", String(opts.roomTypeId));
  fd.set("checkIn", opts.checkIn);
  fd.set("checkOut", opts.checkOut);
  fd.set("phone", opts.phone);
  fd.set("guestName", opts.guestName);
  fd.set("paymentOption", opts.paymentOption);
  if (opts.hotelPaymentMethodId) fd.set("hotelPaymentMethodId", String(opts.hotelPaymentMethodId));

  const res = await fetch(`${BASE}/api/bookings?json=1`, {
    method: "POST",
    body: fd,
    headers: { "x-json": "1", accept: "application/json", ...(opts.cookie ? { cookie: opts.cookie } : {}) }
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, setCookie: res.headers.get("set-cookie") };
}

async function main() {
  console.log("=== BLOCK 5.4B setup ===");
  const runTag = Date.now();
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: (await prisma.user.findFirst({ where: { role: "OWNER" } }))!.id,
      name: `${createdUserNamePrefix} Hotel ${runTag}`,
      city: "Dushanbe",
      address: "Test",
      description: "5.4B fixture",
      propertyType: "HOTEL",
      status: "APPROVED",
      latitude: 38.5,
      longitude: 68.7,
      acceptsPayAtCheckIn: true
    }
  });
  createdHotelIds.push(hotel.id);

  const deniedHotel = await prisma.hotel.create({
    data: {
      ownerId: hotel.ownerId,
      name: `${createdUserNamePrefix} Denied Hotel ${runTag}`,
      city: "Dushanbe",
      address: "Test",
      description: "5.4B fixture - policy disabled",
      propertyType: "HOTEL",
      status: "APPROVED",
      latitude: 38.5,
      longitude: 68.7,
      acceptsPayAtCheckIn: false
    }
  });
  createdHotelIds.push(deniedHotel.id);

  const method = await prisma.hotelPaymentMethod.create({
    data: { hotelId: hotel.id, type: "CARD", displayLabel: "5.4B Card", recipientName: "R", paymentIdentifier: "ID-1", isActive: true }
  });
  createdMethodIds.push(method.id);

  const physicalRoom = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `54B-${runTag}`, title: "5.4B Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(physicalRoom.id);

  const deniedRoom = await prisma.room.create({
    data: { hotelId: deniedHotel.id, roomTypeId: null, roomNumber: `54B-D-${runTag}`, title: "5.4B Denied Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(deniedRoom.id);

  const roomTypeCap1 = await prisma.roomType.create({ data: { hotelId: hotel.id, name: `54B Cap1 ${runTag}`, basePrice: 100, maxGuests: 2 } });
  createdRoomTypeIds.push(roomTypeCap1.id);
  const cap1Room = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: roomTypeCap1.id, roomNumber: `54B-C1-${runTag}`, title: "5.4B Cap1 Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(cap1Room.id);

  const roomTypeCap2 = await prisma.roomType.create({ data: { hotelId: hotel.id, name: `54B Cap2 ${runTag}`, basePrice: 100, maxGuests: 2 } });
  createdRoomTypeIds.push(roomTypeCap2.id);
  const cap2A = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: roomTypeCap2.id, roomNumber: `54B-C2A-${runTag}`, title: "5.4B Cap2 A", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  const cap2B = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: roomTypeCap2.id, roomNumber: `54B-C2B-${runTag}`, title: "5.4B Cap2 B", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(cap2A.id, cap2B.id);

  const physicalRoomB = await prisma.room.create({
    data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `54B-MIX-${runTag}`, title: "5.4B Mixed Room", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true }
  });
  createdRoomIds.push(physicalRoomB.id);

  // ============================================================
  console.log("\n=== A: physical room, 2 concurrent PAY_AT_CHECK_IN guests ===");
  {
    const dates = { checkIn: "2029-01-10", checkOut: "2029-01-12" };
    const [r1, r2] = await Promise.all([
      postBooking({ roomId: physicalRoom.id, ...dates, phone: uniquePhone("a1"), guestName: "A1", paymentOption: "PAY_AT_CHECK_IN" }),
      postBooking({ roomId: physicalRoom.id, ...dates, phone: uniquePhone("a2"), guestName: "A2", paymentOption: "PAY_AT_CHECK_IN" })
    ]);
    const oks = [r1, r2].filter((r) => r.status === 200 && r.json.ok);
    const conflicts = [r1, r2].filter((r) => r.status === 409);
    check("exactly 1 success", oks.length === 1);
    check("exactly 1 conflict (409)", conflicts.length === 1);
    if (oks[0]) createdBookingIds.push(oks[0].json.bookingId);
  }

  console.log("\n=== B: RoomType capacity=1, 2 concurrent PAY_AT_CHECK_IN ===");
  {
    const dates = { checkIn: "2029-01-15", checkOut: "2029-01-17" };
    const [r1, r2] = await Promise.all([
      postBooking({ roomTypeId: roomTypeCap1.id, ...dates, phone: uniquePhone("b1"), guestName: "B1", paymentOption: "PAY_AT_CHECK_IN" }),
      postBooking({ roomTypeId: roomTypeCap1.id, ...dates, phone: uniquePhone("b2"), guestName: "B2", paymentOption: "PAY_AT_CHECK_IN" })
    ]);
    const oks = [r1, r2].filter((r) => r.status === 200 && r.json.ok);
    check("exactly 1 success", oks.length === 1);
    check("exactly 1 conflict", [r1, r2].filter((r) => r.status === 409).length === 1);
    for (const ok of oks) createdBookingIds.push(ok.json.bookingId);
  }

  console.log("\n=== C: RoomType capacity=2, 3 concurrent PAY_AT_CHECK_IN ===");
  {
    const dates = { checkIn: "2029-01-20", checkOut: "2029-01-22" };
    const results = await Promise.all([
      postBooking({ roomTypeId: roomTypeCap2.id, ...dates, phone: uniquePhone("c1"), guestName: "C1", paymentOption: "PAY_AT_CHECK_IN" }),
      postBooking({ roomTypeId: roomTypeCap2.id, ...dates, phone: uniquePhone("c2"), guestName: "C2", paymentOption: "PAY_AT_CHECK_IN" }),
      postBooking({ roomTypeId: roomTypeCap2.id, ...dates, phone: uniquePhone("c3"), guestName: "C3", paymentOption: "PAY_AT_CHECK_IN" })
    ]);
    const oks = results.filter((r) => r.status === 200 && r.json.ok);
    check("exactly 2 successes", oks.length === 2);
    check("exactly 1 conflict", results.filter((r) => r.status === 409).length === 1);
    for (const ok of oks) createdBookingIds.push(ok.json.bookingId);
  }

  console.log("\n=== D: mixed - PAY_NOW vs PAY_AT_CHECK_IN simultaneously, same physical room ===");
  {
    const dates = { checkIn: "2029-01-25", checkOut: "2029-01-27" };
    const [r1, r2] = await Promise.all([
      postBooking({ roomId: physicalRoomB.id, ...dates, phone: uniquePhone("d1"), guestName: "D1", paymentOption: "PAY_NOW", hotelPaymentMethodId: method.id }),
      postBooking({ roomId: physicalRoomB.id, ...dates, phone: uniquePhone("d2"), guestName: "D2", paymentOption: "PAY_AT_CHECK_IN" })
    ]);
    const oks = [r1, r2].filter((r) => r.status === 200 && r.json.ok);
    check("exactly 1 winner across the two different payment options", oks.length === 1);
    check("exactly 1 conflict", [r1, r2].filter((r) => r.status === 409).length === 1);
    if (oks[0]) createdBookingIds.push(oks[0].json.bookingId);
  }

  console.log("\n=== E: existing active WAITING_PAYMENT vs new PAY_AT_CHECK_IN (same room/dates) ===");
  {
    const dates = { checkIn: "2029-02-01", checkOut: "2029-02-03" };
    const seed = await postBooking({ roomId: physicalRoomB.id, checkIn: "2029-02-01", checkOut: "2029-02-03", phone: uniquePhone("e1"), guestName: "E1", paymentOption: "PAY_NOW", hotelPaymentMethodId: method.id });
    check("seed WAITING_PAYMENT created", seed.status === 200 && seed.json.ok === true);
    if (seed.json.ok) createdBookingIds.push(seed.json.bookingId);
    const r2 = await postBooking({ roomId: physicalRoomB.id, ...dates, phone: uniquePhone("e2"), guestName: "E2", paymentOption: "PAY_AT_CHECK_IN" });
    check("PAY_AT_CHECK_IN against active WAITING_PAYMENT hold gets 409", r2.status === 409);
  }

  console.log("\n=== F: existing CONFIRMED pay-at-check-in vs new PAY_NOW (same room/dates) ===");
  {
    const dates = { checkIn: "2029-02-05", checkOut: "2029-02-07" };
    const seed = await postBooking({ roomId: cap1Room.id, ...dates, phone: uniquePhone("f1"), guestName: "F1", paymentOption: "PAY_AT_CHECK_IN" });
    check("seed CONFIRMED pay-at-check-in created", seed.status === 200 && seed.json.ok === true);
    if (seed.json.ok) createdBookingIds.push(seed.json.bookingId);
    const r2 = await postBooking({ roomId: cap1Room.id, ...dates, phone: uniquePhone("f2"), guestName: "F2", paymentOption: "PAY_NOW", hotelPaymentMethodId: method.id });
    check("PAY_NOW against existing CONFIRMED pay-at-check-in gets 409", r2.status === 409);
  }

  console.log("\n=== G: adjacent non-overlapping dates still allowed ===");
  {
    // physicalRoom occupied 2029-01-10..12 from scenario A's winner.
    const r = await postBooking({ roomId: physicalRoom.id, checkIn: "2029-01-12", checkOut: "2029-01-14", phone: uniquePhone("g1"), guestName: "G1", paymentOption: "PAY_AT_CHECK_IN" });
    check("adjacent booking succeeds", r.status === 200 && r.json.ok === true);
    if (r.json.ok) createdBookingIds.push(r.json.bookingId);
  }

  console.log("\n=== H: same user, same intent, same PAY_AT_CHECK_IN, concurrent ===");
  {
    const phone = uniquePhone("h1");
    const dates = { checkIn: "2029-02-10", checkOut: "2029-02-12" };
    const seed = await postBooking({ roomId: cap2A.id, ...dates, phone, guestName: "H1", paymentOption: "PAY_AT_CHECK_IN" });
    check("seed succeeds", seed.status === 200 && seed.json.ok === true);
    const cookie = seed.setCookie?.split(";")[0];
    if (!cookie) throw new Error("no session cookie from seed");
    if (seed.json.ok) createdBookingIds.push(seed.json.bookingId);
    const [d1, d2] = await Promise.all([
      postBooking({ roomId: cap2A.id, ...dates, phone, guestName: "H1", paymentOption: "PAY_AT_CHECK_IN", cookie }),
      postBooking({ roomId: cap2A.id, ...dates, phone, guestName: "H1", paymentOption: "PAY_AT_CHECK_IN", cookie })
    ]);
    check("both concurrent resubmits return ok:true, same booking", d1.json.bookingId === seed.json.bookingId && d2.json.bookingId === seed.json.bookingId);
    const count = await prisma.booking.count({ where: { roomId: cap2A.id, checkIn: new Date("2029-02-10T00:00:00.000Z") } });
    check("exactly 1 booking row (no duplicate)", count === 1);
  }

  console.log("\n=== I: same user, same intent, PAY_NOW vs PAY_AT_CHECK_IN concurrently - no silent switch ===");
  {
    const phone = uniquePhone("i1");
    const dates = { checkIn: "2029-02-15", checkOut: "2029-02-17" };
    const seed = await postBooking({ roomId: cap2B.id, ...dates, phone, guestName: "I1", paymentOption: "PAY_NOW", hotelPaymentMethodId: method.id });
    check("seed PAY_NOW succeeds", seed.status === 200 && seed.json.ok === true);
    if (seed.json.ok) createdBookingIds.push(seed.json.bookingId);
    const cookie = seed.setCookie?.split(";")[0];
    if (!cookie) throw new Error("no session cookie from seed");
    const r2 = await postBooking({ roomId: cap2B.id, ...dates, phone, guestName: "I1", paymentOption: "PAY_AT_CHECK_IN", cookie });
    check("different-option resubmit is a controlled conflict, not a silent switch", r2.status === 409 && r2.json.error === "existing_booking_different_payment_option");
    const after = await prisma.booking.findUnique({ where: { id: seed.json.bookingId }, select: { payOnArrival: true, status: true } });
    check("original booking's payOnArrival/status unchanged by the rejected different-option request", after?.payOnArrival === false && after?.status === "WAITING_PAYMENT");
    const count = await prisma.booking.count({ where: { roomId: cap2B.id, checkIn: new Date("2029-02-15T00:00:00.000Z") } });
    check("still exactly 1 booking row (no duplicate created)", count === 1);
  }

  console.log("\n=== Policy denial: hotel with acceptsPayAtCheckIn=false rejects PAY_AT_CHECK_IN ===");
  {
    const r = await postBooking({ roomId: deniedRoom.id, checkIn: "2029-03-01", checkOut: "2029-03-03", phone: uniquePhone("j1"), guestName: "J1", paymentOption: "PAY_AT_CHECK_IN" });
    check("denied with pay_at_checkin_not_allowed", r.status === 403 && r.json.error === "pay_at_checkin_not_allowed");
    const count = await prisma.booking.count({ where: { roomId: deniedRoom.id } });
    check("no booking created", count === 0);
  }

  console.log("\n=== DB evidence: one PAY_AT_CHECK_IN booking's fields before arrival ===");
  {
    const b = await prisma.booking.findFirst({ where: { roomId: physicalRoom.id, checkIn: new Date("2029-01-10T00:00:00.000Z") } });
    check("status CONFIRMED", b?.status === "CONFIRMED");
    check("payOnArrival true", b?.payOnArrival === true);
    check("paymentStatus PENDING", b?.paymentStatus === "PENDING");
    check("hotelPaymentMethodId null", b?.hotelPaymentMethodId === null);
    check("paymentMethodSnapshot null", b?.paymentMethodSnapshot === null);
    check("expiresAt null", b?.expiresAt === null);
    const paymentCount = b ? await prisma.payment.count({ where: { bookingId: b.id } }) : -1;
    check("Payment row count = 0", paymentCount === 0);
  }

  console.log(failures === 0 ? "\n=== BLOCK 5.4B CONCURRENCY: ALL PASS ===" : `\n=== BLOCK 5.4B CONCURRENCY: ${failures} FAILURE(S) ===`);
}

async function cleanup() {
  console.log("\n=== Cleanup ===");
  const bookingIds = [...new Set(createdBookingIds)];
  await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.transactionLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.notification.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const bookings = await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  console.log("deleted bookings:", bookings.count);

  const apiUsers = await prisma.user.findMany({ where: { name: { in: ["A1","A2","B1","B2","C1","C2","C3","D1","D2","E1","E2","F1","F2","G1","H1","I1","J1"] } }, select: { id: true } });
  const userIds = apiUsers.map((u) => u.id);
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log("deleted users:", users.count);

  const rooms = await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
  const roomTypes = await prisma.roomType.deleteMany({ where: { id: { in: createdRoomTypeIds } } });
  const methods = await prisma.hotelPaymentMethod.deleteMany({ where: { id: { in: createdMethodIds } } });
  const hotels = await prisma.hotel.deleteMany({ where: { id: { in: createdHotelIds } } });
  console.log("deleted rooms:", rooms.count, "roomTypes:", roomTypes.count, "methods:", methods.count, "hotels:", hotels.count);

  const leftoverBookings = await prisma.booking.count({ where: { checkIn: { gte: new Date("2029-01-01") } } });
  const leftoverHotels = await prisma.hotel.count({ where: { id: { in: createdHotelIds } } });
  console.log("VERIFY leftover: bookings(2029+)=", leftoverBookings, "hotels=", leftoverHotels);
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
