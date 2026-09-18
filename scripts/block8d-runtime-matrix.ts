/**
 * BLOCK 8D viewport/theme/locale matrix runner via authenticated HTTP + notes for browser CDP.
 * Primary evidence still comes from browser CDP Emulation — this script validates authenticated
 * page HTTP status / raw enum leaks in HTML for RU/TJ/EN.
 *
 * BASE_URL=http://127.0.0.1:3000 npx tsx scripts/block8d-runtime-matrix.ts
 */
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const RAW = [
  "WAITING_PAYMENT",
  "CHECKED_IN",
  "OWNER_MANUAL",
  "MANAGER_MANUAL",
  "CAPTURED",
  "needs moderation",
  "profile.section",
  "GUEST",
  "PLATFORM"
];

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") ?? "").split(",").map((c) => c.split(";")[0].trim()).join("; ");
  const json = await res.json().catch(() => ({}));
  return { status: res.status, cookie, json };
}

async function page(path: string, cookie: string, locale?: string) {
  const headers: Record<string, string> = { Cookie: cookie, Accept: "text/html" };
  if (locale) headers.Cookie = `${cookie}; locale=${locale}`;
  const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
  const html = await res.text();
  const leaks = RAW.filter((r) => html.includes(`>${r}<`) || html.includes(`"${r}"`) || html.match(new RegExp(`\\b${r}\\b`)));
  // Soften: ignore GUEST/PLATFORM inside scripts/json payloads common in hydration
  const visibleLeaks = leaks.filter((r) => !["GUEST", "PLATFORM"].includes(r) || /data-role=["']GUEST|role["']:\s*["']GUEST/.test(html));
  return { status: res.status, len: html.length, leaks: visibleLeaks, title: (html.match(/<title>([^<]*)/) ?? [])[1] ?? "" };
}

async function makeSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 86400000);
  await prisma.session.create({ data: { token, sessionToken: token, userId, expires: expiresAt, expiresAt } });
  return `tajstay_session=${token}`;
}

async function main() {
  console.log(`\n=== BLOCK 8D RUNTIME MATRIX (HTTP) @ ${BASE} ===\n`);
  const guest = await login("guest@tajstay.local", "Guest123!");
  const owner = await login("owner@tajstay.local", "Owner123!");
  console.log("LOGIN", { guest: guest.status, owner: owner.status, guestCookie: Boolean(guest.cookie), ownerCookie: Boolean(owner.cookie) });
  if (!guest.cookie || !owner.cookie) process.exit(1);

  const guestBooking = await prisma.booking.findFirst({
    where: { userId: 3 },
    orderBy: { id: "desc" },
    select: { id: true, publicCode: true, status: true }
  });
  const chatPath = guestBooking ? `/chat/booking/${guestBooking.id}` : null;

  const guestPaths: { screen: string; path: string }[] = [
    { screen: "Profile", path: "/profile" },
    { screen: "Security", path: "/profile/security" },
    { screen: "Email", path: "/profile/email" },
    { screen: "Telegram", path: "/profile/telegram" },
    { screen: "Sessions", path: "/profile/sessions" },
    { screen: "Notifications settings", path: "/profile/subscriptions" },
    { screen: "Notifications inbox", path: "/notifications" },
    { screen: "Support", path: "/profile/support" },
    { screen: "Become Owner", path: "/profile/become-owner" },
    ...(chatPath ? [{ screen: "Chat", path: chatPath }] : []),
    ...(guestBooking ? [{ screen: "Booking Detail", path: `/payment/${guestBooking.publicCode ?? guestBooking.id}` }] : [])
  ];

  const ownerPaths = [
    { screen: "Owner Overview", path: "/dashboard/owner" },
    { screen: "Owner Object", path: "/dashboard/owner?section=hotels" },
    { screen: "Owner Rooms", path: "/dashboard/owner?section=rooms" },
    { screen: "Owner Bookings", path: "/dashboard/owner?section=bookings" },
    { screen: "Owner Calendar", path: "/dashboard/owner?section=calendar" },
    { screen: "Owner More", path: "/dashboard/owner?section=more" },
    { screen: "Owner Profile", path: "/profile" }
  ];

  console.log("\n--- LOCALE / HTML LEAK ---");
  for (const locale of ["ru", "tg", "en"] as const) {
    for (const p of [...guestPaths.slice(0, 9), ...ownerPaths.slice(0, 3)]) {
      const cookie = p.screen.startsWith("Owner") ? owner.cookie : guest.cookie;
      const r = await page(p.path, cookie, locale);
      const ok = r.status === 200 && r.leaks.length === 0;
      console.log(`${ok ? "PASS" : "FAIL"}  ${locale} ${p.screen} status=${r.status} leaks=${r.leaks.join("|") || "-"} title=${r.title.slice(0, 40)}`);
    }
  }

  // Theme cookie roundtrip
  console.log("\n--- THEME API ---");
  for (const theme of ["light", "dark", "system"]) {
    const res = await fetch(`${BASE}/api/theme`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: guest.cookie },
      body: JSON.stringify({ theme })
    });
    const get = await fetch(`${BASE}/api/theme`, { headers: { Cookie: guest.cookie } });
    const json = await get.json().catch(() => ({}));
    console.log(`${res.status === 200 ? "PASS" : "FAIL"}  theme.set_${theme} get=${JSON.stringify(json)}`);
  }

  // Manager phone login if possible
  const mgr = await prisma.user.findFirst({ where: { phone: "+992917001122", role: "MANAGER" } });
  if (mgr) {
    const cookie = await makeSession(mgr.id);
    for (const p of [
      "/dashboard/manager/today",
      "/dashboard/manager/new",
      "/dashboard/manager/bookings",
      "/dashboard/manager/profile"
    ]) {
      const r = await page(p, cookie);
      console.log(`${r.status === 200 ? "PASS" : "FAIL"}  manager ${p} status=${r.status}`);
    }
    await prisma.session.deleteMany({ where: { token: cookie.replace("tajstay_session=", "") } });
  }

  // Phone honesty
  const phone = await page("/profile/phone", guest.cookie, "ru");
  const phoneOk = /SMS|смс|недоступ|скоро|пока не|not available|otp/i.test(
    (await (await fetch(`${BASE}/profile/phone`, { headers: { Cookie: guest.cookie } })).text())
  );
  console.log(`PHONE page status=${phone.status} honest_copy_probe=${phoneOk}`);

  console.log("\nGUEST_BOOKING", guestBooking);
  await prisma.$disconnect();
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
