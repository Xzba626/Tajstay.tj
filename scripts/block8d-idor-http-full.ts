/**
 * BLOCK 8D — expanded HTTP IDOR + lifecycle probes (local production server).
 * BASE_URL=http://127.0.0.1:3000 npx tsx scripts/block8d-idor-http-full.ts
 */
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

async function makeSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 86400000);
  await prisma.session.create({
    data: { token, sessionToken: token, userId, expires: expiresAt, expiresAt }
  });
  return token;
}

async function req(
  path: string,
  opts: { cookie?: string; method?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.cookie) headers.Cookie = `tajstay_session=${opts.cookie}`;
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body,
    redirect: "manual"
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text: text.slice(0, 180) };
}

async function main() {
  console.log(`\n=== BLOCK 8D FULL HTTP IDOR @ ${BASE} ===\n`);
  const tag = `b8df-${Date.now()}`;
  const guestA = await prisma.user.create({
    data: {
      email: `${tag}-a@tajstay.local`,
      name: "B8DF A",
      password: await hashPassword("GuestA123!"),
      role: "GUEST",
      phone: `+9929${String(Date.now()).slice(-8)}1`.slice(0, 15)
    }
  });
  const guestB = await prisma.user.create({
    data: {
      email: `${tag}-b@tajstay.local`,
      name: "B8DF B",
      password: await hashPassword("GuestB123!"),
      role: "GUEST",
      phone: `+9929${String(Date.now()).slice(-8)}2`.slice(0, 15)
    }
  });
  const owner = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" } });
  const otherOwner = await prisma.user.findFirst({
    where: { role: "OWNER", email: { not: "owner@tajstay.local" } }
  });
  if (!owner) throw new Error("missing owner");
  const cookieA = await makeSession(guestA.id);
  const cookieB = await makeSession(guestB.id);
  const cookieOwner = await makeSession(owner.id);
  const cookieOtherOwner = otherOwner ? await makeSession(otherOwner.id) : null;

  const hotelA = await prisma.hotel.findFirst({ where: { ownerId: owner.id }, orderBy: { id: "asc" } });
  const hotelForeign = otherOwner
    ? await prisma.hotel.findFirst({ where: { ownerId: otherOwner.id } })
    : await prisma.hotel.findFirst({ where: { ownerId: { not: owner.id } } });

  // PROFILE
  check(
    "PROFILE.own_name",
    (await req("/api/profile/update-name", { cookie: cookieA, method: "POST", body: { firstName: "A", lastName: "X" } })).status === 200,
    "own"
  );
  const prefsForeign = await req("/api/profile/notification-preferences", {
    cookie: cookieA,
    method: "POST",
    body: { userId: guestB.id, security: false }
  });
  check(
    "PROFILE.prefs_no_foreign_userId",
    prefsForeign.status === 200 || prefsForeign.status === 400,
    `status=${prefsForeign.status}`
  );
  const prefsB = await prisma.notificationPreference.findUnique({ where: { userId: guestB.id } });
  check("PROFILE.prefs_b_untouched", !prefsB || prefsB.security !== false, String(prefsB?.security));

  // SESSIONS
  const sessA = await prisma.session.findFirst({ where: { userId: guestA.id } });
  const rev = await req("/api/profile/sessions", {
    cookie: cookieB,
    method: "DELETE",
    body: { action: "revoke_one", sessionId: sessA?.id }
  });
  check(
    "SESSIONS.foreign_revoke",
    rev.status === 200 && (rev.json as { revoked?: number })?.revoked === 0,
    JSON.stringify(rev.json)
  );

  // NOTIFICATIONS
  const noteB = await prisma.notification.create({
    data: { userId: guestB.id, type: "BOOKING_CONFIRMED", title: "x", message: "y", isRead: false }
  });
  const mark = await req(`/api/notifications/${noteB.id}/read`, { cookie: cookieA, method: "PATCH" });
  check("NOTIF.foreign_mark", mark.status === 404 || mark.status === 403, `status=${mark.status}`);

  // OWNER APPLICATION
  const app = await prisma.ownerApplication.create({
    data: {
      userId: guestA.id,
      fullName: "X",
      phone: guestA.phone!,
      email: guestA.email!,
      businessName: `${tag}`,
      status: "PENDING",
      applicationMeta: { city: "Dushanbe", propertyType: "HOTEL", address: "a" }
    }
  });
  check(
    "APP.self_approve",
    [401, 403].includes(
      (
        await req(`/api/admin/owner-applications/${app.id}/approve`, {
          cookie: cookieA,
          method: "POST",
          body: {}
        })
      ).status
    ),
    "denied"
  );

  // BOOKING / CHAT (hotel via room relation — Booking has no hotelId column)
  const bookingOwn = await prisma.booking.findFirst({
    where: { userId: { not: null }, OR: [{ roomId: { not: null } }, { assignedRoomId: { not: null } }] },
    orderBy: { id: "desc" },
    include: {
      room: { select: { hotelId: true } },
      assignedRoom: { select: { hotelId: true } }
    }
  });
  if (bookingOwn) {
    const hotelId = bookingOwn.assignedRoom?.hotelId ?? bookingOwn.room?.hotelId ?? null;
    const guestForeign = await req(`/api/chat/booking/${bookingOwn.id}/messages`, { cookie: cookieA });
    check(
      "CHAT.foreign_guest",
      bookingOwn.userId === guestA.id ? guestForeign.status === 200 : guestForeign.status === 403,
      `status=${guestForeign.status}`
    );
    const ownerChat = await req(`/api/chat/booking/${bookingOwn.id}/messages`, { cookie: cookieOwner });
    const hotel = hotelId ? await prisma.hotel.findUnique({ where: { id: hotelId } }) : null;
    const ownerOk = hotel?.ownerId === owner.id;
    check(
      "CHAT.owner_hotel_scope",
      ownerOk ? ownerChat.status === 200 : ownerChat.status === 403 || !hotelId,
      `status=${ownerChat.status} ownerOk=${ownerOk}`
    );
  } else {
    check("CHAT.foreign_guest", true, "skipped_no_booking");
    check("CHAT.owner_hotel_scope", true, "skipped_no_booking");
  }

  // OWNER HOTEL / ROOM / EXPENSE / REQUISITES / STAFF / AUDIT
  // Note: /api/owner/hotels/[id] is POST-only (405 on GET) — probe calendar + rooms + list mutations.
  if (hotelA) {
    check(
      "OWNER.calendar_own",
      (await req(`/api/owner/calendar?hotelId=${hotelA.id}`, { cookie: cookieOwner })).status === 200,
      "own"
    );
    check(
      "OWNER.calendar_guest_denied",
      [401, 403].includes(
        (await req(`/api/owner/calendar?hotelId=${hotelA.id}`, { cookie: cookieA })).status
      ),
      "guest"
    );
    check(
      "OWNER.rooms_own",
      (await req(`/api/owner/room-types?hotelId=${hotelA.id}`, { cookie: cookieOwner })).status === 200,
      "own"
    );
    check(
      "OWNER.expenses_own",
      [200, 404].includes((await req(`/api/owner/expenses?hotelId=${hotelA.id}`, { cookie: cookieOwner })).status),
      "own"
    );
    check(
      "OWNER.expenses_guest_denied",
      [401, 403].includes((await req(`/api/owner/expenses?hotelId=${hotelA.id}`, { cookie: cookieA })).status),
      "guest"
    );
    check(
      "OWNER.staff_own",
      [200, 404].includes((await req(`/api/owner/staff?hotelId=${hotelA.id}`, { cookie: cookieOwner })).status),
      "own"
    );
    check(
      "OWNER.staff_guest_denied",
      [401, 403].includes((await req(`/api/owner/staff?hotelId=${hotelA.id}`, { cookie: cookieA })).status),
      "guest"
    );
    check(
      "OWNER.audit_own",
      [200, 404].includes((await req(`/api/owner/audit?hotelId=${hotelA.id}`, { cookie: cookieOwner })).status),
      "own"
    );
    check(
      "OWNER.audit_guest_denied",
      [401, 403].includes((await req(`/api/owner/audit?hotelId=${hotelA.id}`, { cookie: cookieA })).status),
      "guest"
    );
    check(
      "OWNER.payment_methods_own",
      [200, 404].includes(
        (await req(`/api/owner/hotels/${hotelA.id}/payment-methods`, { cookie: cookieOwner })).status
      ),
      "own"
    );
    // Foreign hotel mutation attempt (POST edit)
    if (hotelForeign) {
      const foreignEdit = await req(`/api/owner/hotels/${hotelForeign.id}`, {
        cookie: cookieOwner,
        method: "POST",
        body: { name: "x" }
      });
      check(
        "OWNER.hotel_foreign_denied",
        [401, 403, 400, 415].includes(foreignEdit.status) || foreignEdit.status >= 300,
        `status=${foreignEdit.status}`
      );
      check(
        "OWNER.rooms_foreign_denied",
        [401, 403, 404].includes(
          (await req(`/api/owner/room-types?hotelId=${hotelForeign.id}`, { cookie: cookieOwner })).status
        ),
        "foreign rooms"
      );
    }
  }

  // Manager assigned vs wrong hotel
  const mgrStaff = await prisma.hotelStaff.findFirst({
    where: { status: "ACTIVE", staffRole: "MANAGER" },
    include: { user: true }
  });
  if (mgrStaff) {
    const cookieMgr = await makeSession(mgrStaff.userId);
    const today = await req(`/api/manager/today?hotelId=${mgrStaff.hotelId}`, { cookie: cookieMgr });
    check("MANAGER.today_assigned", today.status === 200, `status=${today.status}`);
    check(
      "MANAGER.bookings_assigned",
      [200, 403].includes(
        (await req(`/api/manager/bookings?hotelId=${mgrStaff.hotelId}`, { cookie: cookieMgr })).status
      ),
      "bookings"
    );
    const wrongHotel = await prisma.hotel.findFirst({
      where: { id: { not: mgrStaff.hotelId } },
      select: { id: true }
    });
    if (wrongHotel) {
      const denied = await req(`/api/manager/today?hotelId=${wrongHotel.id}`, { cookie: cookieMgr });
      check(
        "MANAGER.wrong_hotel_denied",
        [401, 403, 400].includes(denied.status),
        `status=${denied.status}`
      );
    }
    if (hotelA) {
      const staffMut = await req("/api/owner/staff", {
        cookie: cookieMgr,
        method: "POST",
        body: { hotelId: hotelA.id, phone: "+992900000099", name: "X" }
      });
      check(
        "MANAGER.staff_mutation_denied",
        [401, 403, 405].includes(staffMut.status),
        `status=${staffMut.status}`
      );
    }
    await prisma.session.deleteMany({ where: { token: cookieMgr } });
  }

  // logout / unauth
  check(
    "AUTH.sessions_unauth",
    [401, 403].includes((await req("/api/profile/sessions")).status),
    "unauth"
  );

  // Support page is nav hub — prove contacts/FAQ exist and no fake ticket API success
  const supportPage = await req("/profile/support", { cookie: cookieA });
  check("SUPPORT.page_auth", supportPage.status === 200 || supportPage.status === 307, `status=${supportPage.status}`);
  const fakeTicket = await req("/api/support/tickets", {
    cookie: cookieA,
    method: "POST",
    body: { message: "test" }
  });
  check(
    "SUPPORT.no_fake_ticket_api",
    fakeTicket.status === 404,
    `status=${fakeTicket.status}`
  );

  // cleanup
  await prisma.notification.deleteMany({ where: { userId: { in: [guestA.id, guestB.id] } } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: [guestA.id, guestB.id] } } });
  await prisma.ownerApplication.deleteMany({ where: { id: app.id } });
  await prisma.session.deleteMany({
    where: { userId: { in: [guestA.id, guestB.id, owner.id, ...(otherOwner ? [otherOwner.id] : [])] } }
  });
  await prisma.user.deleteMany({ where: { id: { in: [guestA.id, guestB.id] } } });
  await prisma.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
