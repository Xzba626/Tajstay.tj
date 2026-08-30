/** One-off Phase B QA helper — run with: node scripts/phase-b-qa.mjs */
const BASE = "http://localhost:3000";

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, cookie, json };
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, len: text.length, snippet: text.slice(0, 120) };
}

async function post(path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const sections = [
  "dashboard",
  "applications",
  "hotels",
  "users",
  "owner-access",
  "bookings",
  "finance",
  "complaints",
  "notifications",
  "content",
];

const admin = await login("admin@tajstay.local", "Admin123!");
const owner = await login("owner@tajstay.local", "Owner123!");
const guest = await login("guest@tajstay.local", "Guest123!");

console.log("LOGIN", {
  admin: admin.status,
  owner: owner.status,
  guest: guest.status,
});

const sectionResults = [];
for (const s of sections) {
  const r = await get(`/dashboard/admin?section=${s}`, admin.cookie);
  sectionResults.push({ section: s, status: r.status, ok: r.status === 200 });
}
console.log("SECTIONS", sectionResults);

const security = [];

// No auth
security.push({
  test: "admin page unauthenticated",
  ...(await get("/dashboard/admin", "")),
});

// Guest cannot access admin APIs (sample)
const adminMutations = [
  ["/api/admin/owner-applications/1/approve", {}],
  ["/api/admin/hotels/moderate", { id: 1, status: "APPROVED" }],
  ["/api/admin/bookings/payment", { id: 1, paymentStatus: "PAID" }],
  ["/api/admin/users/update", { id: 2, role: "ADMIN" }],
  ["/api/admin/security/update", { currentPassword: "x", newPassword: "y" }],
];

for (const [path, body] of adminMutations) {
  security.push({
    test: `guest POST ${path}`,
    ...(await post(path, body, guest.cookie)),
  });
  security.push({
    test: `owner POST ${path}`,
    ...(await post(path, body, owner.cookie)),
  });
  security.push({
    test: `no-auth POST ${path}`,
    ...(await post(path, body, "")),
  });
}

console.log("SECURITY", security);
