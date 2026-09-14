/**
 * BLOCK 5.2A — Concurrency Closure. Real concurrent HTTP requests against a running dev server
 * (must be up on http://127.0.0.1:3000) exercising POST /api/bookings AFTER BLOCK 5.2 made
 * hotelPaymentMethodId mandatory - proving the pre-existing Block 4.x inventory/hold invariants
 * still hold with a real, valid HotelPaymentMethod on every request (not weakened for this test).
 *
 * Run: npx tsx scripts/test-block52a-concurrency.ts
 * Requires: npm run dev already running on port 3000.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
let failures = 0;
const createdBookingIds: number[] = [];
const createdRoomIds: number[] = [];
const createdRoomTypeIds: number[] = [];
const createdMethodIds: number[] = [];
const createdUserIds: number[] = [];

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
  hotelPaymentMethodId: number;
  cookie?: string;
}) {
  const fd = new FormData();
  if (opts.roomId) fd.set("roomId", String(opts.roomId));
  if (opts.roomTypeId) fd.set("roomTypeId", String(opts.roomTypeId));
  fd.set("checkIn", opts.checkIn);
  fd.set("checkOut", opts.checkOut);
  fd.set("phone", opts.phone);
  fd.set("guestName", opts.guestName);
  fd.set("hotelPaymentMethodId", String(opts.hotelPaymentMethodId));

  const res = await fetch(`${BASE}/api/bookings?json=1`, {
    method: "POST",
    body: fd,
    headers: {
      "x-json": "1",
      accept: "application/json",
      ...(opts.cookie ? { cookie: opts.cookie } : {})
    }
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, setCookie: res.headers.get("set-cookie") };
}

async function main() {
  console.log("=== BLOCK 5.2A setup ===");
  const hotel = await prisma.hotel.findFirst({ where: { status: "APPROVED" } });
  if (!hotel) throw new Error("no approved hotel found");
  const method = await prisma.hotelPaymentMethod.create({
    data: {
      hotelId: hotel.id,
      type: "CARD",
      displayLabel: "5.2A Concurrency Fixture",
      recipientName: "5.2A Recipient",
      paymentIdentifier: "5.2A-0001",
      isActive: true,
      sortOrder: 99
    }
  });
  createdMethodIds.push(method.id);
  console.log("hotel", hotel.id, "method", method.id);

  const physicalRoom = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      roomTypeId: null,
      roomNumber: `5.2A-${Date.now()}`,
      title: "5.2A Physical Room",
      price: 100,
      capacity: 2,
      amenities: "[]",
      status: "ACTIVE",
      availability: true
    }
  });
  createdRoomIds.push(physicalRoom.id);

  const runTag = Date.now();
  const roomTypeCap1 = await prisma.roomType.create({
    data: { hotelId: hotel.id, name: `5.2A Cap1 ${runTag}`, basePrice: 100, maxGuests: 2 }
  });
  createdRoomTypeIds.push(roomTypeCap1.id);
  const cap1Room = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      roomTypeId: roomTypeCap1.id,
      roomNumber: `5.2A-C1-${Date.now()}`,
      title: "5.2A Cap1 Room",
      price: 100,
      capacity: 2,
      amenities: "[]",
      status: "ACTIVE",
      availability: true
    }
  });
  createdRoomIds.push(cap1Room.id);

  const roomTypeCap2 = await prisma.roomType.create({
    data: { hotelId: hotel.id, name: `5.2A Cap2 ${runTag}`, basePrice: 100, maxGuests: 2 }
  });
  createdRoomTypeIds.push(roomTypeCap2.id);
  const cap2RoomA = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      roomTypeId: roomTypeCap2.id,
      roomNumber: `5.2A-C2A-${Date.now()}`,
      title: "5.2A Cap2 Room A",
      price: 100,
      capacity: 2,
      amenities: "[]",
      status: "ACTIVE",
      availability: true
    }
  });
  const cap2RoomB = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      roomTypeId: roomTypeCap2.id,
      roomNumber: `5.2A-C2B-${Date.now()}`,
      title: "5.2A Cap2 Room B",
      price: 100,
      capacity: 2,
      amenities: "[]",
      status: "ACTIVE",
      availability: true
    }
  });
  createdRoomIds.push(cap2RoomA.id, cap2RoomB.id);

  // ============================================================
  console.log("\n=== Scenario 1: physical room, 2 concurrent guests, overlapping dates ===");
  {
    const dates = { checkIn: "2028-01-10", checkOut: "2028-01-12" };
    const [r1, r2] = await Promise.all([
      postBooking({ roomId: physicalRoom.id, ...dates, phone: uniquePhone("1"), guestName: "S1 Guest A", hotelPaymentMethodId: method.id }),
      postBooking({ roomId: physicalRoom.id, ...dates, phone: uniquePhone("2"), guestName: "S1 Guest B", hotelPaymentMethodId: method.id })
    ]);
    const oks = [r1, r2].filter((r) => r.status === 200 && r.json.ok);
    const conflicts = [r1, r2].filter((r) => r.status === 409);
    check("exactly 1 success", oks.length === 1);
    check("exactly 1 conflict (409)", conflicts.length === 1);
    if (oks[0]) createdBookingIds.push(oks[0].json.bookingId);
    const dbCount = await prisma.booking.count({
      where: { roomId: physicalRoom.id, checkIn: new Date("2028-01-10T00:00:00.000Z") }
    });
    check("exactly 1 booking row in DB for this room+date", dbCount === 1);
    const dbPayments = oks[0] ? await prisma.payment.count({ where: { bookingId: oks[0].json.bookingId } }) : -1;
    check("exactly 1 payment row for the winning booking", dbPayments === 1);
  }

  // ============================================================
  console.log("\n=== Scenario 2: RoomType capacity=1, 2 concurrent requests ===");
  {
    const dates = { checkIn: "2028-01-15", checkOut: "2028-01-17" };
    const [r1, r2] = await Promise.all([
      postBooking({ roomTypeId: roomTypeCap1.id, ...dates, phone: uniquePhone("3"), guestName: "S2 Guest A", hotelPaymentMethodId: method.id }),
      postBooking({ roomTypeId: roomTypeCap1.id, ...dates, phone: uniquePhone("4"), guestName: "S2 Guest B", hotelPaymentMethodId: method.id })
    ]);
    const oks = [r1, r2].filter((r) => r.status === 200 && r.json.ok);
    const conflicts = [r1, r2].filter((r) => r.status === 409);
    check("exactly 1 success", oks.length === 1);
    check("exactly 1 conflict (409)", conflicts.length === 1);
    for (const ok of oks) createdBookingIds.push(ok.json.bookingId);
  }

  // ============================================================
  console.log("\n=== Scenario 3: RoomType capacity=2, 3 concurrent requests ===");
  {
    const dates = { checkIn: "2028-01-20", checkOut: "2028-01-22" };
    const [r1, r2, r3] = await Promise.all([
      postBooking({ roomTypeId: roomTypeCap2.id, ...dates, phone: uniquePhone("5"), guestName: "S3 Guest A", hotelPaymentMethodId: method.id }),
      postBooking({ roomTypeId: roomTypeCap2.id, ...dates, phone: uniquePhone("6"), guestName: "S3 Guest B", hotelPaymentMethodId: method.id }),
      postBooking({ roomTypeId: roomTypeCap2.id, ...dates, phone: uniquePhone("7"), guestName: "S3 Guest C", hotelPaymentMethodId: method.id })
    ]);
    const oks = [r1, r2, r3].filter((r) => r.status === 200 && r.json.ok);
    const conflicts = [r1, r2, r3].filter((r) => r.status === 409);
    check("exactly 2 successes", oks.length === 2);
    check("exactly 1 conflict (409)", conflicts.length === 1);
    for (const ok of oks) createdBookingIds.push(ok.json.bookingId);
  }

  // ============================================================
  console.log("\n=== Scenario 4: active WAITING_PAYMENT hold blocks a later request ===");
  {
    // Scenario 1's winner already occupies physicalRoom 2028-01-10..12 as WAITING_PAYMENT.
    const r3 = await postBooking({
      roomId: physicalRoom.id,
      checkIn: "2028-01-10",
      checkOut: "2028-01-12",
      phone: uniquePhone("8"),
      guestName: "S4 Guest C",
      hotelPaymentMethodId: method.id
    });
    check("third request against the still-active hold gets 409", r3.status === 409);
  }

  // ============================================================
  console.log("\n=== Scenario 5: expired WAITING_PAYMENT hold releases inventory ===");
  {
    const expiredDates = { checkIn: new Date("2028-02-01T00:00:00.000Z"), checkOut: new Date("2028-02-03T00:00:00.000Z") };
    const guestUser = await prisma.user.create({
      data: {
        name: "S5 Expired Hold Owner",
        phone: uniquePhone("9"),
        password: crypto.randomBytes(16).toString("hex"),
        role: "GUEST"
      }
    });
    createdUserIds.push(guestUser.id);
    const expiredBooking = await prisma.booking.create({
      data: {
        publicCode: `TJTEST${Date.now()}`,
        userId: guestUser.id,
        roomId: physicalRoom.id,
        assignedRoomId: physicalRoom.id,
        checkIn: expiredDates.checkIn,
        checkOut: expiredDates.checkOut,
        totalPrice: 200,
        commission: 0,
        subtotal: 200,
        serviceFee: 0,
        taxAmount: 0,
        currency: "TJS",
        paymentStatus: "PENDING",
        paymentMethod: "TEST",
        payOnArrival: false,
        phone: guestUser.phone!,
        status: "WAITING_PAYMENT",
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1h in the past
      }
    });
    createdBookingIds.push(expiredBooking.id);

    const r = await postBooking({
      roomId: physicalRoom.id,
      checkIn: "2028-02-01",
      checkOut: "2028-02-03",
      phone: uniquePhone("10"),
      guestName: "S5 New Guest",
      hotelPaymentMethodId: method.id
    });
    check("new booking succeeds despite the expired hold", r.status === 200 && r.json.ok === true);
    if (r.json.ok) createdBookingIds.push(r.json.bookingId);
  }

  // ============================================================
  console.log("\n=== Scenario 6: adjacent non-overlapping dates still allowed ===");
  {
    // physicalRoom is occupied 2028-01-10..12 (scenario 1's winner). Book 12..14 (checkout==checkin, non-overlapping).
    const r = await postBooking({
      roomId: physicalRoom.id,
      checkIn: "2028-01-12",
      checkOut: "2028-01-14",
      phone: uniquePhone("11"),
      guestName: "S6 Adjacent Guest",
      hotelPaymentMethodId: method.id
    });
    check("adjacent (non-overlapping) booking succeeds", r.status === 200 && r.json.ok === true);
    if (r.json.ok) createdBookingIds.push(r.json.bookingId);
  }

  // ============================================================
  console.log("\n=== Scenario 7: same-user simultaneous duplicate requests (idempotency under concurrency) ===");
  {
    const phone = uniquePhone("12");
    const dates = { checkIn: "2028-01-25", checkOut: "2028-01-27" };
    // First request creates the guest + session cookie; reuse that cookie for the concurrent pair.
    const seed = await postBooking({ roomId: cap1Room.id, ...dates, phone, guestName: "S7 Guest", hotelPaymentMethodId: method.id });
    check("seed request succeeds", seed.status === 200 && seed.json.ok === true);
    const cookie = seed.setCookie?.split(";")[0];
    if (!cookie) throw new Error("no session cookie returned from seed request");
    if (seed.json.ok) createdBookingIds.push(seed.json.bookingId);

    const [d1, d2] = await Promise.all([
      postBooking({ roomId: cap1Room.id, ...dates, phone, guestName: "S7 Guest", hotelPaymentMethodId: method.id, cookie }),
      postBooking({ roomId: cap1Room.id, ...dates, phone, guestName: "S7 Guest", hotelPaymentMethodId: method.id, cookie })
    ]);
    check("both concurrent resubmits return ok:true", d1.json.ok === true && d2.json.ok === true);
    check("both resolve to the SAME bookingId as the seed", d1.json.bookingId === seed.json.bookingId && d2.json.bookingId === seed.json.bookingId);
    const bookingCount = await prisma.booking.count({ where: { roomId: cap1Room.id, checkIn: new Date("2028-01-25T00:00:00.000Z") } });
    check("exactly 1 booking row total (no duplicate)", bookingCount === 1);
    const paymentCount = await prisma.payment.count({ where: { bookingId: seed.json.bookingId } });
    check("exactly 1 payment row total (no duplicate)", paymentCount === 1);
  }

  // ============================================================
  console.log("\n=== Scenario 8: losing/conflicting requests leave no orphan side effects ===");
  {
    // All bookings created above are tracked in createdBookingIds. Any booking NOT in that list
    // but touching our test rooms/date ranges would indicate an orphan from a "losing" request.
    const allTestBookings = await prisma.booking.findMany({
      where: { OR: [{ roomId: { in: createdRoomIds } }, { roomTypeId: { in: createdRoomTypeIds } }] },
      select: { id: true }
    });
    const unexpected = allTestBookings.filter((b) => !createdBookingIds.includes(b.id));
    check("no unexpected/orphan booking rows beyond the tracked winners", unexpected.length === 0);

    const orphanPayments = await prisma.payment.count({
      where: { bookingId: { notIn: createdBookingIds.length ? createdBookingIds : [-1] }, booking: { OR: [{ roomId: { in: createdRoomIds } }, { roomTypeId: { in: createdRoomTypeIds } }] } }
    });
    check("no orphan payment rows for these test rooms/roomTypes", orphanPayments === 0);
  }

  console.log(failures === 0 ? "\n=== BLOCK 5.2A: ALL PASS ===" : `\n=== BLOCK 5.2A: ${failures} FAILURE(S) ===`);
}

async function cleanup() {
  console.log("\n=== Cleanup ===");
  const bookingIds = [...new Set(createdBookingIds)];
  const pay = await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const tx = await prisma.transactionLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const notif = await prisma.notification.deleteMany({ where: { bookingId: { in: bookingIds } } });
  const bookings = await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  console.log("deleted payments:", pay.count, "txlogs:", tx.count, "notifications:", notif.count, "bookings:", bookings.count);

  // Guest users created by the API calls themselves (by phone prefix used in uniquePhone) plus the
  // one explicit S5 fixture user.
  const apiUsers = await prisma.user.findMany({
    where: { name: { startsWith: "S" }, phone: { startsWith: "+992" } },
    select: { id: true, name: true }
  });
  const relevantUserIds = [...new Set([...apiUsers.map((u) => u.id), ...createdUserIds])];
  await prisma.session.deleteMany({ where: { userId: { in: relevantUserIds } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: relevantUserIds } } });
  console.log("deleted users:", users.count);

  const rooms = await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
  const roomTypes = await prisma.roomType.deleteMany({ where: { id: { in: createdRoomTypeIds } } });
  const methods = await prisma.hotelPaymentMethod.deleteMany({ where: { id: { in: createdMethodIds } } });
  console.log("deleted rooms:", rooms.count, "roomTypes:", roomTypes.count, "paymentMethods:", methods.count);

  // Verify.
  const leftoverBookings = await prisma.booking.count({ where: { checkIn: { gte: new Date("2028-01-01") } } });
  const leftoverRooms = await prisma.room.count({ where: { id: { in: createdRoomIds } } });
  const leftoverRoomTypes = await prisma.roomType.count({ where: { id: { in: createdRoomTypeIds } } });
  const leftoverMethods = await prisma.hotelPaymentMethod.count({ where: { id: { in: createdMethodIds } } });
  const leftoverUsers = await prisma.user.count({ where: { id: { in: relevantUserIds } } });
  console.log("VERIFY leftover: bookings(2028+)=", leftoverBookings, "rooms=", leftoverRooms, "roomTypes=", leftoverRoomTypes, "methods=", leftoverMethods, "users=", leftoverUsers);
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
