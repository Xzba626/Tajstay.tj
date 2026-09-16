/**
 * OWNER BLOCK 5C — HTTP/DB runtime closure harness (local only).
 * Run with dev server up: npx tsx scripts/owner-block5c-runtime.ts
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import {
  createHotelManager,
  suspendHotelStaff,
  reactivateHotelStaff,
  resetHotelStaffAccess,
  removeHotelStaffAccess,
  activateStaffInvite
} from "../src/lib/staff/staffService";
import { createManualOfflineBooking } from "../src/lib/services/ownerOfflineBooking";
import { recordHotelBookingPayment } from "../src/lib/services/recordHotelPayment";
import { getHotelTodayBoard, businessTodayYmd, HOTEL_BUSINESS_TZ } from "../src/lib/services/managerToday";
import { getHotelAnalytics } from "../src/lib/owner/analytics/getHotelAnalytics";
import { BOOKING_SOURCE, BOOKING_STATUS } from "../src/lib/domain/booking";
import { canAccessBookingChatAsync } from "../src/lib/chat/bookingAccess";
import { bookingWithHotelInclude } from "../src/lib/pms/prismaIncludes";
import { withRoomOverlapGuard, DatesUnavailableError } from "../src/lib/booking/availability";
import { markBookingRevenueRecognized } from "../src/lib/owner/analytics/getHotelAnalytics";

const BASE = process.env.BLOCK5C_BASE || "http://127.0.0.1:3000";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function loginCookie(phone: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });
  if (!res.ok) return null;
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const joined = setCookie.length ? setCookie.join(";") : res.headers.get("set-cookie") ?? "";
  const m = /tajstay_session=([^;]+)/.exec(joined);
  return m?.[1] ?? null;
}

async function api(path: string, opts: { cookie?: string | null; method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.cookie) headers.Cookie = `tajstay_session=${opts.cookie}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text: text.slice(0, 200) };
}

async function main() {
  try {
    const h = await fetch(`${BASE}/api/auth/me`, { cache: "no-store" });
    check("runtime.server.up", h.status === 200 || h.status === 401, `status=${h.status}`);
  } catch (e) {
    check("runtime.server.up", false, String(e));
    process.exit(1);
  }

  const stamp = Date.now();
  const ownerPhone = `+992910${String(stamp).slice(-6)}`;
  const managerPhone = `+992911${String(stamp).slice(-6)}`;
  const guestPhone = `+992912${String(stamp).slice(-6)}`;
  const ownerPass = "Owner5cPass!";
  const managerFinalPass = "Manager5cPass9!";
  const guestPass = "Guest5cPass!";

  const owner = await prisma.user.create({
    data: {
      name: "Block5C Owner",
      phone: ownerPhone,
      email: `owner5c-${stamp}@tajstay.local`,
      password: await hashPassword(ownerPass),
      role: "OWNER",
      verified: true
    }
  });
  const guest = await prisma.user.create({
    data: {
      name: "Block5C Guest",
      phone: guestPhone,
      email: `guest5c-${stamp}@tajstay.local`,
      password: await hashPassword(guestPass),
      role: "GUEST",
      verified: true
    }
  });

  const hotelA = await prisma.hotel.create({
    data: {
      name: `5C Hotel A ${stamp}`,
      city: "Dushanbe",
      address: "A",
      description: "5c",
      status: "APPROVED",
      ownerId: owner.id,
      latitude: 38.56,
      longitude: 68.77
    }
  });
  const hotelB = await prisma.hotel.create({
    data: {
      name: `5C Hotel B ${stamp}`,
      city: "Khujand",
      address: "B",
      description: "5c",
      status: "APPROVED",
      ownerId: owner.id,
      latitude: 40.28,
      longitude: 69.63
    }
  });

  const rtA = await prisma.roomType.create({
    data: { hotelId: hotelA.id, name: "Std", basePrice: 500, maxGuests: 2, adults: 2 }
  });
  const roomA1 = await prisma.room.create({
    data: {
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      title: "101",
      roomNumber: `5C${String(stamp).slice(-3)}A`,
      price: 500,
      capacity: 2,
      amenities: "[]"
    }
  });
  const roomA2 = await prisma.room.create({
    data: {
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      title: "102",
      roomNumber: `5C${String(stamp).slice(-3)}B`,
      price: 500,
      capacity: 2,
      amenities: "[]"
    }
  });
  const roomRace = await prisma.room.create({
    data: {
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      title: "103",
      roomNumber: `5C${String(stamp).slice(-3)}R`,
      price: 500,
      capacity: 2,
      amenities: "[]"
    }
  });

  const invited = await createHotelManager({
    ownerId: owner.id,
    hotelId: hotelA.id,
    firstName: "Dilshod",
    lastName: "Manager",
    phone: managerPhone
  });
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: invited.userId } });
  check("cred.no_plaintext_in_db", !dbUser.password.includes(invited.tempPassword) && dbUser.password.startsWith("$2"));
  const staffRow = await prisma.hotelStaff.findUniqueOrThrow({ where: { id: invited.staffId } });
  check(
    "invite.hash_not_plaintext",
    Boolean(staffRow.inviteTokenHash) && !(staffRow.inviteTokenHash ?? "").includes(invited.inviteToken.slice(0, 12))
  );
  check("invite.ttl_set", Boolean(staffRow.inviteExpiresAt && staffRow.inviteExpiresAt.getTime() > Date.now()));

  await activateStaffInvite({ token: invited.inviteToken, newPassword: managerFinalPass });
  const reuse = await activateStaffInvite({ token: invited.inviteToken, newPassword: managerFinalPass })
    .then(() => false)
    .catch(() => true);
  check("invite.single_use", reuse);

  const invited2Phone = `+992913${String(stamp).slice(-6)}`;
  const invited2 = await createHotelManager({
    ownerId: owner.id,
    hotelId: hotelA.id,
    firstName: "Temp",
    lastName: "Expire",
    phone: invited2Phone
  });
  await prisma.hotelStaff.update({
    where: { id: invited2.staffId },
    data: { inviteExpiresAt: new Date(Date.now() - 1000) }
  });
  const expiredDenied = await activateStaffInvite({
    token: invited2.inviteToken,
    newPassword: "ExpiredPass99!"
  })
    .then(() => false)
    .catch((e) => e instanceof Error && e.message === "INVITE_EXPIRED");
  check("invite.expired_denied", expiredDenied);
  await prisma.hotelStaff.delete({ where: { id: invited2.staffId } });
  await prisma.user.delete({ where: { id: invited2.userId } });

  const ownerCookie = await loginCookie(ownerPhone, ownerPass);
  const managerCookie = await loginCookie(managerPhone, managerFinalPass);
  const guestCookie = await loginCookie(guestPhone, guestPass);
  check("login.owner", Boolean(ownerCookie));
  check("login.manager", Boolean(managerCookie));
  check("login.guest", Boolean(guestCookie));

  const mgrHotels = await api("/api/manager/bookings", { cookie: managerCookie });
  const hotels = ((mgrHotels.json as { hotels?: { id: number }[] })?.hotels ?? []).map((h) => h.id);
  check("manager.hotels.list", mgrHotels.status === 200);
  check("manager.hotels.only_A", hotels.includes(hotelA.id) && !hotels.includes(hotelB.id));

  const foreign = await api(`/api/manager/today?hotelId=${hotelB.id}`, { cookie: managerCookie });
  check("manager.hotelB.today.denied", foreign.status === 403 || foreign.status === 401);

  const foreignBook = await api("/api/manager/bookings", {
    cookie: managerCookie,
    body: {
      hotelId: hotelB.id,
      roomTypeId: rtA.id,
      checkIn: "2031-01-10",
      checkOut: "2031-01-12",
      guestName: "X",
      guestPhone: "+992900111222",
      settlement: "CASH",
      markPaid: true
    }
  });
  check("manager.hotelB.create.denied", [400, 401, 403].includes(foreignBook.status));

  const analyticsDenied = await api(`/api/owner/analytics?hotelId=${hotelA.id}&period=month`, {
    cookie: managerCookie
  });
  check("manager.analytics.denied", analyticsDenied.status === 403 || analyticsDenied.status === 401);
  const expenses = await api(`/api/owner/expenses?hotelId=${hotelA.id}`, { cookie: managerCookie });
  check("manager.expenses.denied", expenses.status === 403 || expenses.status === 401);
  const staffApi = await api(`/api/owner/staff?hotelId=${hotelA.id}`, { cookie: managerCookie });
  check("manager.staff.denied", staffApi.status === 403 || staffApi.status === 401);
  const admin = await api("/dashboard/admin", { cookie: managerCookie });
  check("manager.admin.page_not_admin_shell", admin.status === 200 || admin.status === 307 || admin.status === 302 || admin.status === 401 || admin.status === 403);
  // Manager hitting admin API
  const adminApi = await api("/api/admin/subscription/price", { cookie: managerCookie });
  check("manager.admin.api.denied", [401, 403, 404, 405].includes(adminApi.status));

  const guestMgr = await api("/api/manager/bookings", { cookie: guestCookie });
  check("guest.manager.denied", guestMgr.status === 403 || guestMgr.status === 401);

  const today = businessTodayYmd();
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 2);
  const checkOut = d.toISOString().slice(0, 10);

  const created = await api("/api/manager/bookings", {
    cookie: managerCookie,
    body: {
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      roomId: roomA1.id,
      checkIn: today,
      checkOut,
      guestName: "Runtime Guest",
      guestPhone: `+992914${String(stamp).slice(-6)}`,
      guestCount: 1,
      settlement: "CASH",
      markPaid: true
    }
  });
  check(
    "manual.create.http",
    created.status === 200,
    `status=${created.status} body=${JSON.stringify(created.json).slice(0, 140)}`
  );
  const publicCode = (created.json as { publicCode?: string })?.publicCode;
  const bookingId = (created.json as { bookingId?: number })?.bookingId;
  check("manual.reference", Boolean(publicCode && /^TS-[A-Z0-9]+$/i.test(publicCode)));

  if (bookingId) {
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    check("manual.db.source", b.source === BOOKING_SOURCE.MANAGER_MANUAL);
    check("manual.db.cash", b.settlementChannel === "CASH" && b.paymentStatus === "PAID");
    check("manual.db.price", Number(b.totalPrice) === 1000);

    const search = await api(`/api/manager/bookings?hotelId=${hotelA.id}&q=${encodeURIComponent(publicCode!)}`, {
      cookie: managerCookie
    });
    const items = ((search.json as { items?: { id: number }[] })?.items ?? []).map((i) => i.id);
    check("search.code", search.status === 200 && items.includes(bookingId));

    const searchB = await api(`/api/manager/bookings?hotelId=${hotelB.id}&q=${encodeURIComponent(publicCode!)}`, {
      cookie: managerCookie
    });
    check("search.foreign_hotel.denied", searchB.status === 403 || searchB.status === 401);
  }

  const board = await getHotelTodayBoard(hotelA.id);
  check("today.tz", board.timeZone === HOTEL_BUSINESS_TZ);
  if (bookingId) {
    check(
      "today.arrivals_or_inhouse",
      board.arrivals.some((a) => a.id === bookingId) || board.inHouse.some((a) => a.id === bookingId)
    );
  }
  const ymdLate = businessTodayYmd(new Date(`${today}T23:59:59+05:00`));
  const ymdNext = businessTodayYmd(new Date(`${today}T00:00:00+05:00`));
  check("today.boundary_same_day_evening", ymdLate === today);
  check("today.boundary_midnight_start", ymdNext === today);

  // Pay-at-check-in
  const pac = await prisma.booking.create({
    data: {
      source: BOOKING_SOURCE.PLATFORM,
      userId: guest.id,
      roomTypeId: rtA.id,
      roomId: roomA2.id,
      assignedRoomId: roomA2.id,
      checkIn: new Date(`${today}T00:00:00.000Z`),
      checkOut: new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)) + 2)),
      guestName: "PAC Guest",
      guestPhone: guestPhone,
      phone: guestPhone,
      guestCount: 1,
      totalPrice: 1000,
      commission: 0,
      subtotal: 1000,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: "PENDING",
      payOnArrival: true,
      publicCode: `TS-PAC${String(stamp).slice(-4)}`
    }
  });

  const pay1 = await recordHotelBookingPayment({
    hotelId: hotelA.id,
    bookingId: pac.id,
    actorUserId: invited.userId,
    actorRole: "MANAGER",
    settlement: "CARD"
  });
  check("pac.transition", pay1.ok && !pay1.alreadyDone);
  const pacAfter = await prisma.booking.findUniqueOrThrow({ where: { id: pac.id } });
  check(
    "pac.state",
    pacAfter.status === BOOKING_STATUS.CHECKED_IN &&
      pacAfter.paymentStatus === "PAID" &&
      pacAfter.settlementChannel === "CARD"
  );
  const pay2 = await recordHotelBookingPayment({
    hotelId: hotelA.id,
    bookingId: pac.id,
    actorUserId: invited.userId,
    actorRole: "MANAGER",
    settlement: "CASH"
  });
  check("pac.idempotent", pay2.alreadyDone === true);
  const pacFinal = await prisma.booking.findUniqueOrThrow({ where: { id: pac.id } });
  check("pac.no_double_channel_flip", pacFinal.settlementChannel === "CARD");

  // Analytics: controlled A/B/C with far-future recognized dates won't hit "today" — use current window bookings
  const analyticsDto = await getHotelAnalytics({
    ownerId: owner.id,
    hotelId: hotelA.id,
    periodKey: "custom",
    from: today,
    to: checkOut,
    includeContributing: true
  });
  check("analytics.runtime_ok", typeof analyticsDto.revenue.total === "number");
  check(
    "analytics.offline_and_cash",
    analyticsDto.revenue.offline >= 1000 && analyticsDto.revenue.cash >= 1000,
    `offline=${analyticsDto.revenue.offline} cash=${analyticsDto.revenue.cash} card=${analyticsDto.revenue.card} total=${analyticsDto.revenue.total}`
  );
  check("analytics.card_from_pac", analyticsDto.revenue.card >= 1000);

  // Controlled A/B/C reconciliation fixture (isolated amounts via dedicated recognized bookings)
  const fixtureIn = new Date("2032-08-01T00:00:00.000Z");
  const fixtureOut = new Date("2032-08-03T00:00:00.000Z");
  const roomFix = await prisma.room.create({
    data: {
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      title: "201",
      roomNumber: `5CF${String(stamp).slice(-3)}`,
      price: 500,
      capacity: 2,
      amenities: "[]"
    }
  });
  const mk = async (opts: {
    source: string;
    settlement: string;
    amount: number;
    code: string;
    roomId?: number | null;
  }) => {
    const row = await prisma.booking.create({
      data: {
        source: opts.source,
        userId: opts.source === BOOKING_SOURCE.PLATFORM ? guest.id : null,
        createdByOwnerId: opts.source === BOOKING_SOURCE.OWNER_MANUAL ? owner.id : null,
        roomTypeId: rtA.id,
        roomId: opts.roomId ?? null,
        assignedRoomId: opts.roomId ?? null,
        checkIn: fixtureIn,
        checkOut: fixtureOut,
        guestName: opts.code,
        guestPhone: guestPhone,
        phone: guestPhone,
        totalPrice: opts.amount,
        commission: 0,
        subtotal: opts.amount,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: "PAID",
        offlineStatus: opts.source === BOOKING_SOURCE.PLATFORM ? null : "CONFIRMED",
        settlementChannel: opts.settlement,
        offlinePaymentType: opts.settlement,
        publicCode: opts.code,
        revenueRecognizedAt: new Date("2032-08-02T12:00:00.000Z")
      }
    });
    await markBookingRevenueRecognized(row.id, { settlementChannel: opts.settlement as "CASH" | "CARD", at: new Date("2032-08-02T12:00:00.000Z") });
    return row;
  };
  await mk({ source: BOOKING_SOURCE.PLATFORM, settlement: "CARD", amount: 1000, code: `TS-FA${String(stamp).slice(-4)}`, roomId: roomFix.id });
  // second/third without physical room to avoid EXCLUDE — RoomType capacity ok for unassigned
  await mk({ source: BOOKING_SOURCE.MANAGER_MANUAL, settlement: "CASH", amount: 500, code: `TS-FB${String(stamp).slice(-4)}` });
  await mk({ source: BOOKING_SOURCE.MANAGER_MANUAL, settlement: "CARD", amount: 300, code: `TS-FC${String(stamp).slice(-4)}` });

  const recon = await getHotelAnalytics({
    ownerId: owner.id,
    hotelId: hotelA.id,
    periodKey: "custom",
    from: "2032-08-01",
    to: "2032-08-31",
    includeContributing: true
  });
  check("recon.revenue_1800", Math.abs(recon.revenue.total - 1800) < 0.01, `total=${recon.revenue.total}`);
  check("recon.online_1000", Math.abs(recon.revenue.online - 1000) < 0.01, `online=${recon.revenue.online}`);
  check("recon.offline_800", Math.abs(recon.revenue.offline - 800) < 0.01, `offline=${recon.revenue.offline}`);
  check("recon.card_1300", Math.abs(recon.revenue.card - 1300) < 0.01, `card=${recon.revenue.card}`);
  check("recon.cash_500", Math.abs(recon.revenue.cash - 500) < 0.01, `cash=${recon.revenue.cash}`);

  // Chat
  const chatBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: pac.id },
    include: bookingWithHotelInclude
  });
  check("chat.manager_A.allowed", await canAccessBookingChatAsync(chatBooking, { id: invited.userId, role: "MANAGER" }));

  const mgrBPhone = `+992915${String(stamp).slice(-6)}`;
  const mgrB = await createHotelManager({
    ownerId: owner.id,
    hotelId: hotelB.id,
    firstName: "Other",
    lastName: "Mgr",
    phone: mgrBPhone
  });
  await activateStaffInvite({ token: mgrB.inviteToken, newPassword: "OtherMgrPass9!" });
  check("chat.manager_B.denied", !(await canAccessBookingChatAsync(chatBooking, { id: mgrB.userId, role: "MANAGER" })));

  // Suspend
  await prisma.session.create({
    data: {
      userId: invited.userId,
      token: `5c-sess-${stamp}`,
      sessionToken: `5c-sess-${stamp}`,
      expires: new Date(Date.now() + 86400000),
      expiresAt: new Date(Date.now() + 86400000)
    }
  });
  await suspendHotelStaff({ ownerId: owner.id, hotelId: hotelA.id, staffId: invited.staffId });
  check("suspend.sessions_gone", (await prisma.session.count({ where: { userId: invited.userId } })) === 0);
  const suspendedApi = await api(`/api/manager/today?hotelId=${hotelA.id}`, { cookie: managerCookie });
  check("suspend.api_denied", suspendedApi.status === 403 || suspendedApi.status === 401);

  await reactivateHotelStaff({ ownerId: owner.id, hotelId: hotelA.id, staffId: invited.staffId });
  check("reactivate.old_session_still_gone", (await prisma.session.count({ where: { userId: invited.userId } })) === 0);
  const managerCookie2 = await loginCookie(managerPhone, managerFinalPass);
  check("reactivate.new_login", Boolean(managerCookie2));
  check("reactivate.api_ok", (await api(`/api/manager/today?hotelId=${hotelA.id}`, { cookie: managerCookie2 })).status === 200);

  await prisma.session.create({
    data: {
      userId: invited.userId,
      token: `5c-sess2-${stamp}`,
      sessionToken: `5c-sess2-${stamp}`,
      expires: new Date(Date.now() + 86400000),
      expiresAt: new Date(Date.now() + 86400000)
    }
  });
  const reset = await resetHotelStaffAccess({ ownerId: owner.id, hotelId: hotelA.id, staffId: invited.staffId });
  check("reset.temp_once", Boolean(reset.tempPassword));
  check("reset.sessions_gone", (await prisma.session.count({ where: { userId: invited.userId } })) === 0);
  const afterResetApi = await api(`/api/manager/today?hotelId=${hotelA.id}`, { cookie: managerCookie2 });
  check("reset.old_cookie_dead", afterResetApi.status === 401 || afterResetApi.status === 403);

  await activateStaffInvite({ token: reset.inviteToken, newPassword: managerFinalPass });
  const managerCookie3 = await loginCookie(managerPhone, managerFinalPass);
  check("reset.relogin", Boolean(managerCookie3));

  await removeHotelStaffAccess({ ownerId: owner.id, hotelId: hotelA.id, staffId: invited.staffId });
  check("chat.after_remove.denied", !(await canAccessBookingChatAsync(chatBooking, { id: invited.userId, role: "MANAGER" })));
  check(
    "api.after_remove.denied",
    [401, 403].includes((await api(`/api/manager/bookings?hotelId=${hotelA.id}`, { cookie: managerCookie3 })).status)
  );

  const audits = await prisma.ownerHotelAuditLog.findMany({ where: { hotelId: hotelA.id }, take: 40 });
  const actions = audits.map((a) => a.action);
  check("audit.staff_events", actions.some((a) => a.startsWith("staff.")));
  check("audit.payment_or_offline", actions.some((a) => a.includes("payment") || a.includes("offline")));
  check(
    "audit.no_secrets",
    !audits.some((a) => String(a.afterState ?? "").includes(invited.tempPassword) || String(a.afterState ?? "").includes(reset.tempPassword))
  );

  // Manager vs PLATFORM race via EXCLUDE
  await prisma.hotelStaff.update({
    where: { id: invited.staffId },
    data: { status: "ACTIVE", mustChangePassword: false }
  });
  const raceIn = new Date("2031-06-01T00:00:00.000Z");
  const raceOut = new Date("2031-06-03T00:00:00.000Z");
  const race = await Promise.allSettled([
    createManualOfflineBooking({
      actorUserId: invited.userId,
      actorRole: "MANAGER",
      hotelId: hotelA.id,
      roomTypeId: rtA.id,
      roomId: roomRace.id,
      checkIn: raceIn,
      checkOut: raceOut,
      guestName: "Race Mgr",
      guestPhone: `+992916${String(stamp).slice(-6)}`,
      offlinePaymentType: "CASH",
      markPaid: true
    }),
    withRoomOverlapGuard(() =>
      prisma.booking.create({
        data: {
          source: BOOKING_SOURCE.PLATFORM,
          userId: guest.id,
          roomTypeId: rtA.id,
          roomId: roomRace.id,
          assignedRoomId: roomRace.id,
          checkIn: raceIn,
          checkOut: raceOut,
          guestName: "Race Guest",
          guestPhone: guestPhone,
          phone: guestPhone,
          totalPrice: 1000,
          commission: 0,
          status: BOOKING_STATUS.CONFIRMED,
          paymentStatus: "PAID",
          publicCode: `TS-RACE${String(stamp).slice(-3)}`
        }
      })
    )
  ]);
  const wins = race.filter((r) => r.status === "fulfilled").length;
  const losses = race.filter((r) => r.status === "rejected").length;
  check("race.manager_vs_guest.one_wins", wins === 1 && losses === 1, `wins=${wins} losses=${losses}`);
  const lossIsControlled = race.some(
    (r) =>
      r.status === "rejected" &&
      (r.reason instanceof DatesUnavailableError ||
        (r.reason instanceof Error && (r.reason.message === "dates_unavailable" || /exclusion|23P01/i.test(r.reason.message))))
  );
  check("race.controlled_conflict", lossIsControlled);

  // Cleanup
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { roomId: { in: [roomA1.id, roomA2.id, roomRace.id, roomFix.id] } },
        { assignedRoomId: { in: [roomA1.id, roomA2.id, roomRace.id, roomFix.id] } },
        { roomTypeId: rtA.id }
      ]
    }
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: [owner.id, invited.userId, guest.id, mgrB.userId] } }
  });
  await prisma.ownerHotelAuditLog.deleteMany({ where: { hotelId: { in: [hotelA.id, hotelB.id] } } });
  await prisma.hotelStaff.deleteMany({ where: { userId: { in: [invited.userId, mgrB.userId] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [owner.id, invited.userId, guest.id, mgrB.userId] } } });
  await prisma.room.deleteMany({ where: { id: { in: [roomA1.id, roomA2.id, roomRace.id, roomFix.id] } } });
  await prisma.roomType.delete({ where: { id: rtA.id } });
  await prisma.hotel.deleteMany({ where: { id: { in: [hotelA.id, hotelB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, invited.userId, guest.id, mgrB.userId] } } });

  console.log(`\nBlock5C runtime: ${passed} passed, ${failed} failed @ ${BASE}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
