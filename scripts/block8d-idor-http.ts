/**
 * BLOCK 8D — real HTTP IDOR with session cookies (local).
 * Requires server: BASE_URL=http://localhost:3000 npx tsx scripts/block8d-idor-http.ts
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
  opts: { cookie?: string; method?: string; body?: unknown; form?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.cookie) headers.Cookie = `tajstay_session=${opts.cookie}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form);
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
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
  return { status: res.status, json, text: text.slice(0, 200) };
}

async function main() {
  console.log(`\n=== BLOCK 8D HTTP IDOR @ ${BASE} ===\n`);
  try {
    const health = await fetch(`${BASE}/auth/sign-in`, { redirect: "manual" });
    check("server.up", health.status > 0, String(health.status));
  } catch (e) {
    check("server.up", false, e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const tag = `b8d-${Date.now()}`;
  const guestA = await prisma.user.create({
    data: {
      email: `${tag}-a@tajstay.local`,
      name: "B8D A",
      password: await hashPassword("GuestA123!"),
      role: "GUEST",
      phone: `+9929${String(Date.now()).slice(-8)}1`.slice(0, 15)
    }
  });
  const guestB = await prisma.user.create({
    data: {
      email: `${tag}-b@tajstay.local`,
      name: "B8D B",
      password: await hashPassword("GuestB123!"),
      role: "GUEST",
      phone: `+9929${String(Date.now()).slice(-8)}2`.slice(0, 15)
    }
  });
  const owner = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" } });
  if (!owner) {
    check("fixture.owner", false, "missing");
    process.exit(1);
  }
  const cookieA = await makeSession(guestA.id);
  const cookieB = await makeSession(guestB.id);
  const cookieOwner = await makeSession(owner.id);

  // PROFILE name update — own OK
  const ownName = await req("/api/profile/update-name", {
    cookie: cookieA,
    method: "POST",
    body: { firstName: "B8D", lastName: "Alpha" }
  });
  check(
    "profile.update_own",
    ownName.status === 200 || ownName.status === 400,
    `status=${ownName.status}`
  );

  // NOTIFICATIONS — create for B, A cannot mark read
  const noteB = await prisma.notification.create({
    data: {
      userId: guestB.id,
      type: "BOOKING_CONFIRMED",
      title: "B8D",
      message: "foreign",
      isRead: false
    }
  });
  const markForeign = await req(`/api/notifications/${noteB.id}/read`, {
    cookie: cookieA,
    method: "PATCH"
  });
  check(
    "notif.foreign_mark_denied",
    markForeign.status === 404 || markForeign.status === 403,
    `status=${markForeign.status}`
  );
  const still = await prisma.notification.findUnique({ where: { id: noteB.id } });
  check("notif.foreign_unread", still?.isRead === false, String(still?.isRead));

  const listA = await req("/api/notifications/list", { cookie: cookieA });
  const items = (listA.json as { items?: { id: number }[] })?.items ?? [];
  check(
    "notif.list_no_foreign",
    listA.status === 200 && !items.some((i) => i.id === noteB.id),
    `status=${listA.status} count=${items.length}`
  );

  // Prefs — own OK
  const prefs = await req("/api/profile/notification-preferences", {
    cookie: cookieA,
    method: "POST",
    body: { security: true, bookingUpdates: true }
  });
  check("notif.prefs_own", prefs.status === 200, `status=${prefs.status}`);

  // SESSIONS — B cannot revoke A's session by guessing
  const sessA = await prisma.session.findFirst({ where: { userId: guestA.id } });
  const revokeForeign = await req("/api/profile/sessions", {
    cookie: cookieB,
    method: "DELETE",
    body: { action: "revoke_one", sessionId: sessA?.id }
  });
  check(
    "sessions.foreign_revoke_noop_or_denied",
    (revokeForeign.status === 200 &&
      (revokeForeign.json as { revoked?: number })?.revoked === 0) ||
      revokeForeign.status === 400 ||
      revokeForeign.status === 403 ||
      revokeForeign.status === 401,
    `status=${revokeForeign.status} body=${JSON.stringify(revokeForeign.json)}`
  );
  const sessStill = sessA ? await prisma.session.findUnique({ where: { id: sessA.id } }) : null;
  check("sessions.a_still_exists", Boolean(sessStill), String(Boolean(sessStill)));

  // OWNER APPLICATION — guest A create, guest B cannot approve
  const app = await prisma.ownerApplication.create({
    data: {
      userId: guestA.id,
      fullName: "B8D App",
      phone: guestA.phone!,
      email: guestA.email!,
      businessName: `${tag}-biz`,
      status: "PENDING",
      applicationMeta: { city: "Dushanbe", propertyType: "HOTEL", address: "x" }
    }
  });
  const selfApprove = await req(`/api/admin/owner-applications/${app.id}/approve`, {
    cookie: cookieA,
    method: "POST",
    body: {}
  });
  check(
    "app.self_approve_denied",
    selfApprove.status === 401 || selfApprove.status === 403,
    `status=${selfApprove.status}`
  );
  const foreignApprove = await req(`/api/admin/owner-applications/${app.id}/approve`, {
    cookie: cookieB,
    method: "POST",
    body: {}
  });
  check(
    "app.foreign_approve_denied",
    foreignApprove.status === 401 || foreignApprove.status === 403,
    `status=${foreignApprove.status}`
  );

  // BOOKING / CHAT — find a booking owned by someone
  const booking = await prisma.booking.findFirst({
    where: { userId: { not: null }, status: { not: "CANCELLED" } },
    orderBy: { id: "desc" },
    select: { id: true, userId: true }
  });
  if (booking) {
    const chatForeign = await req(`/api/chat/booking/${booking.id}/messages`, {
      cookie: cookieA
    });
    const allowed =
      booking.userId === guestA.id
        ? chatForeign.status === 200
        : chatForeign.status === 403 || chatForeign.status === 401;
    check(
      "chat.access_boundary",
      booking.userId === guestA.id ? chatForeign.status === 200 : chatForeign.status === 403,
      `bookingUser=${booking.userId} status=${chatForeign.status}`
    );
    void allowed;
  } else {
    check("chat.access_boundary", true, "skipped_no_booking");
  }

  // OWNER rooms API — foreign hotelId denied
  const hotels = await prisma.hotel.findMany({
    where: { ownerId: owner.id },
    select: { id: true },
    take: 2
  });
  if (hotels[0]) {
    const ownRooms = await req(`/api/owner/room-types?hotelId=${hotels[0].id}`, {
      cookie: cookieOwner
    });
    check("owner.rooms_own", ownRooms.status === 200, `status=${ownRooms.status}`);
    const guestRooms = await req(`/api/owner/room-types?hotelId=${hotels[0].id}`, {
      cookie: cookieA
    });
    check(
      "owner.rooms_guest_denied",
      guestRooms.status === 401 || guestRooms.status === 403,
      `status=${guestRooms.status}`
    );
  }

  // Unauthenticated protected
  const noAuth = await req("/api/profile/sessions");
  check("auth.required_sessions", noAuth.status === 401 || noAuth.status === 403, `status=${noAuth.status}`);

  // cleanup
  await prisma.notification.deleteMany({ where: { userId: { in: [guestA.id, guestB.id] } } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: [guestA.id, guestB.id] } } });
  await prisma.ownerApplication.deleteMany({ where: { id: app.id } });
  await prisma.session.deleteMany({ where: { userId: { in: [guestA.id, guestB.id] } } });
  await prisma.session.deleteMany({ where: { token: cookieOwner } });
  await prisma.user.deleteMany({ where: { id: { in: [guestA.id, guestB.id] } } });

  await prisma.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) process.exit(1);
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
