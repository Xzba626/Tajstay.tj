/**
 * OWNER BLOCK 5 — Staff / Manager / offline booking security & domain tests.
 * Run: npx tsx scripts/owner-block5-tests.ts
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import {
  createHotelManager,
  suspendHotelStaff,
  reactivateHotelStaff,
  activateStaffInvite,
  resetHotelStaffAccess
} from "../src/lib/staff/staffService";
import { requireHotelPermission, HOTEL_PERMISSION } from "../src/lib/staff/hotelAccess";
import { createManualOfflineBooking } from "../src/lib/services/ownerOfflineBooking";
import { recordHotelBookingPayment } from "../src/lib/services/recordHotelPayment";
import { getHotelTodayBoard, businessTodayYmd } from "../src/lib/services/managerToday";
import { bookingChannelFromSource } from "../src/lib/owner/analytics/types";
import { BOOKING_SOURCE } from "../src/lib/domain/booking";
import { getHotelAnalytics } from "../src/lib/owner/analytics/getHotelAnalytics";
import { hashInviteToken } from "../src/lib/staff/types";
import { generateBookingCode } from "../src/lib/services/bookingCode";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const stamp = Date.now();
  const ownerPhone = `+992900${String(stamp).slice(-6)}`;
  const managerPhone = `+992901${String(stamp).slice(-6)}`;
  const ownerPass = await hashPassword("OwnerBlock5Pass!");

  const owner = await prisma.user.create({
    data: { name: "Block5 Owner", phone: ownerPhone, password: ownerPass, role: "OWNER", verified: true }
  });

  const hotelA = await prisma.hotel.create({
    data: {
      name: `Block5 Hotel A ${stamp}`,
      city: "Dushanbe",
      address: "A",
      description: "test",
      status: "APPROVED",
      ownerId: owner.id,
      latitude: 38.56,
      longitude: 68.77
    }
  });
  const hotelB = await prisma.hotel.create({
    data: {
      name: `Block5 Hotel B ${stamp}`,
      city: "Khujand",
      address: "B",
      description: "test",
      status: "APPROVED",
      ownerId: owner.id,
      latitude: 40.28,
      longitude: 69.63
    }
  });

  const rtA = await prisma.roomType.create({
    data: {
      hotelId: hotelA.id,
      name: "Standard",
      basePrice: 500,
      maxGuests: 2,
      adults: 2
    }
  });
  const roomA = await prisma.room.create({
    data: {
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      title: "101",
      roomNumber: `A${String(stamp).slice(-4)}`,
      price: 500,
      capacity: 2,
      amenities: "[]"
    }
  });

  // --- Staff create / password hash only ---
  const created = await createHotelManager({
    ownerId: owner.id,
    hotelId: hotelA.id,
    firstName: "Ali",
    lastName: "Manager",
    phone: managerPhone
  });
  check("staff.create.returnsOnceTemp", Boolean(created.tempPassword && created.inviteToken));
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: created.userId } });
  check("staff.password.hashed", dbUser.password.startsWith("$2") && !dbUser.password.includes(created.tempPassword));
  check("staff.role.manager", dbUser.role === "MANAGER");
  const okTemp = await verifyPassword(created.tempPassword, dbUser.password);
  check("staff.tempPassword.verifies", okTemp);

  // Hotel isolation AuthZ
  let deniedB = false;
  try {
    await requireHotelPermission(created.userId, hotelB.id, HOTEL_PERMISSION.BOOKING_VIEW);
  } catch {
    deniedB = true;
  }
  check("authz.manager.hotelB.denied", deniedB);

  // Activate via invite
  const activated = await activateStaffInvite({
    token: created.inviteToken,
    newPassword: "ManagerSecure9!"
  });
  check("invite.activate", activated.userId === created.userId);
  const reuseDenied = await activateStaffInvite({
    token: created.inviteToken,
    newPassword: "ManagerSecure9!"
  }).then(() => false).catch(() => true);
  check("invite.singleUse", reuseDenied);

  await requireHotelPermission(created.userId, hotelA.id, HOTEL_PERMISSION.BOOKING_CREATE_OFFLINE);
  check("authz.manager.hotelA.pass", true);

  // Owner analytics denied to manager path (ownership check)
  let analyticsDenied = false;
  try {
    await getHotelAnalytics({ ownerId: created.userId, hotelId: hotelA.id, periodKey: "today" });
  } catch {
    analyticsDenied = true;
  }
  check("authz.manager.analytics.denied", analyticsDenied);

  // Offline booking + source + cash
  const today = businessTodayYmd();
  const checkIn = new Date(`${today}T00:00:00.000Z`);
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 2);

  const booking = await createManualOfflineBooking({
    actorUserId: created.userId,
    actorRole: "MANAGER",
    hotelId: hotelA.id,
    roomTypeId: rtA.id,
    roomId: roomA.id,
    checkIn,
    checkOut,
    guestName: "Guest One",
    guestPhone: `+992902${String(stamp).slice(-6)}`,
    guestCount: 1,
    offlinePaymentType: "CASH",
    markPaid: true
  });
  check("offline.source.manager", booking.source === BOOKING_SOURCE.MANAGER_MANUAL);
  check("offline.channel.offline", bookingChannelFromSource(booking.source) === "offline");
  check("offline.paid.cash", booking.paymentStatus === "PAID" && booking.settlementChannel === "CASH");
  check("offline.code", Boolean(booking.publicCode));
  check("offline.price.authoritative", Number(booking.totalPrice) === 1000);

  // Today board
  const board = await getHotelTodayBoard(hotelA.id);
  check("today.arrivals", board.arrivals.some((a) => a.id === booking.id));

  // Payment idempotency on already paid
  const pay2 = await recordHotelBookingPayment({
    hotelId: hotelA.id,
    bookingId: booking.id,
    actorUserId: created.userId,
    actorRole: "MANAGER",
    settlement: "CASH"
  });
  check("payment.idempotent", pay2.alreadyDone === true);

  // Booking codes unique
  const codes = new Set<string>();
  for (let i = 0; i < 5; i++) codes.add(await generateBookingCode());
  check("bookingCode.unique", codes.size === 5);

  // Session revoke on suspend
  await prisma.session.create({
    data: {
      userId: created.userId,
      token: `tok-${stamp}`,
      sessionToken: `tok-${stamp}`,
      expires: new Date(Date.now() + 86400000),
      expiresAt: new Date(Date.now() + 86400000)
    }
  });
  await suspendHotelStaff({ ownerId: owner.id, hotelId: hotelA.id, staffId: created.staffId });
  const sessionsLeft = await prisma.session.count({ where: { userId: created.userId } });
  check("suspend.sessionsRevoked", sessionsLeft === 0);
  let suspendedDenied = false;
  try {
    await requireHotelPermission(created.userId, hotelA.id, HOTEL_PERMISSION.BOOKING_VIEW);
  } catch {
    suspendedDenied = true;
  }
  check("suspend.apiDenied", suspendedDenied);

  await reactivateHotelStaff({ ownerId: owner.id, hotelId: hotelA.id, staffId: created.staffId });
  // Old sessions stay gone
  const sessionsAfter = await prisma.session.count({ where: { userId: created.userId } });
  check("reactivate.noOldSession", sessionsAfter === 0);
  await requireHotelPermission(created.userId, hotelA.id, HOTEL_PERMISSION.BOOKING_VIEW);
  check("reactivate.accessRestored", true);

  // Reset access revokes + new temp
  await prisma.session.create({
    data: {
      userId: created.userId,
      token: `tok2-${stamp}`,
      sessionToken: `tok2-${stamp}`,
      expires: new Date(Date.now() + 86400000),
      expiresAt: new Date(Date.now() + 86400000)
    }
  });
  const reset = await resetHotelStaffAccess({ ownerId: owner.id, hotelId: hotelA.id, staffId: created.staffId });
  check("reset.tempOnce", Boolean(reset.tempPassword));
  const sessAfterReset = await prisma.session.count({ where: { userId: created.userId } });
  check("reset.sessionsRevoked", sessAfterReset === 0);

  // Invite token stored hashed
  const staffRow = await prisma.hotelStaff.findUniqueOrThrow({ where: { id: created.staffId } });
  if (staffRow.inviteTokenHash) {
    check("invite.hashStored", staffRow.inviteTokenHash === hashInviteToken(reset.inviteToken));
  } else {
    check("invite.hashStored", false, "missing hash after reset");
  }

  // Concurrency: two managers last room
  const farIn = new Date("2030-06-01T00:00:00.000Z");
  const farOut = new Date("2030-06-03T00:00:00.000Z");
  const results = await Promise.allSettled([
    createManualOfflineBooking({
      actorUserId: created.userId,
      actorRole: "MANAGER",
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      roomId: roomA.id,
      checkIn: farIn,
      checkOut: farOut,
      guestName: "Race A",
      guestPhone: `+992903${String(stamp).slice(-6)}`,
      offlinePaymentType: "CARD",
      markPaid: true
    }),
    createManualOfflineBooking({
      actorUserId: owner.id,
      actorRole: "OWNER",
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      roomId: roomA.id,
      checkIn: farIn,
      checkOut: farOut,
      guestName: "Race B",
      guestPhone: `+992904${String(stamp).slice(-6)}`,
      offlinePaymentType: "CASH",
      markPaid: true
    })
  ]);
  const wins = results.filter((r) => r.status === "fulfilled").length;
  const losses = results.filter((r) => r.status === "rejected").length;
  const lossReasons = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
  check(
    "concurrency.oneWins",
    wins === 1 && losses === 1,
    `wins=${wins} losses=${losses} reasons=${lossReasons.join(",")}`
  );

  // Analytics channel mapping for MANAGER_MANUAL
  check(
    "analytics.managerManual.offline",
    bookingChannelFromSource(BOOKING_SOURCE.MANAGER_MANUAL) === "offline"
  );

  // Cleanup fixture (local only)
  await prisma.booking.deleteMany({
    where: { OR: [{ roomId: roomA.id }, { roomTypeId: rtA.id }, { assignedRoomId: roomA.id }] }
  });
  await prisma.notification.deleteMany({ where: { userId: { in: [owner.id, created.userId] } } });
  await prisma.hotelStaff.deleteMany({ where: { userId: created.userId } });
  await prisma.session.deleteMany({ where: { userId: { in: [owner.id, created.userId] } } });
  await prisma.room.delete({ where: { id: roomA.id } });
  await prisma.roomType.delete({ where: { id: rtA.id } });
  await prisma.ownerHotelAuditLog.deleteMany({ where: { hotelId: { in: [hotelA.id, hotelB.id] } } });
  await prisma.hotel.deleteMany({ where: { id: { in: [hotelA.id, hotelB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, created.userId] } } });

  console.log(`\nBlock5 tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
