/**
 * BLOCK 8D — Owner Application lifecycle via public HTTP + Admin session cookies.
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import crypto from "node:crypto";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function makeSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 86400000);
  await prisma.session.create({
    data: { token, sessionToken: token, userId, expires: expiresAt, expiresAt }
  });
  return `tajstay_session=${token}`;
}

function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  return ok;
}

async function main() {
  const tag = `b8d-app-${Date.now()}`;
  const email = `${tag}@tajstay.local`;
  const password = "GuestApp123!";
  const user = await prisma.user.create({
    data: {
      email,
      name: "B8D Applicant",
      password: await hashPassword(password),
      role: "GUEST",
      phone: `+9929${String(Date.now()).slice(-8)}`.slice(0, 15)
    }
  });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("no admin");
  const guestCookie = await makeSession(user.id);
  const adminCookie = await makeSession(admin.id);

  const submit = await fetch(`${BASE}/api/owner/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: JSON.stringify({
      fullName: "B8D Applicant",
      phone: user.phone,
      email,
      businessName: `${tag}-biz`,
      city: "Dushanbe",
      propertyType: "HOTEL",
      address: "Rudaki 1",
      consent: true
    })
  });
  const submitJson = await submit.json().catch(() => ({}));
  check("submit", submit.status < 300 && (submitJson.ok === true || submitJson.id || submitJson.applicationId), `${submit.status} ${JSON.stringify(submitJson).slice(0,160)}`);

  let app = await prisma.ownerApplication.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" } });
  check("db.pending", app?.status === "PENDING", String(app?.status));
  check("no_owner_yet", (await prisma.user.findUnique({ where: { id: user.id } }))?.role === "GUEST", "GUEST");

  const self = await fetch(`${BASE}/api/admin/owner-applications/${app!.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: "{}"
  });
  check("self_approve_denied", self.status === 401 || self.status === 403, String(self.status));

  const foreign = await fetch(`${BASE}/api/admin/owner-applications/${app!.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: await makeSession(3) },
    body: "{}"
  });
  check("foreign_guest_approve_denied", foreign.status === 401 || foreign.status === 403, String(foreign.status));

  const reject = await fetch(`${BASE}/api/admin/owner-applications/${app!.id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ comment: "B8D incomplete docs" })
  });
  const rejectJson = await reject.json().catch(() => ({}));
  check("reject", reject.status < 300, `${reject.status} ${JSON.stringify(rejectJson).slice(0,120)}`);
  app = await prisma.ownerApplication.findUnique({ where: { id: app!.id } });
  check("db.rejected", app?.status === "REJECTED", `${app?.status} comment=${app?.comment ?? "?"}`);

  const page = await fetch(`${BASE}/profile/become-owner`, { headers: { Cookie: guestCookie } });
  const html = await page.text();
  check(
    "ui.reject_visible",
    page.status === 200 && (/B8D incomplete|отклон|reject/i.test(html)),
    `status=${page.status}`
  );

  const reapply = await fetch(`${BASE}/api/owner/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: JSON.stringify({
      fullName: "B8D Applicant Fixed",
      phone: user.phone,
      email,
      businessName: `${tag}-biz2`,
      city: "Dushanbe",
      propertyType: "HOTEL",
      address: "Rudaki 2",
      consent: true
    })
  });
  check("reapply", reapply.status < 300, String(reapply.status));
  app = await prisma.ownerApplication.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" } });
  check("db.pending2", app?.status === "PENDING", String(app?.status));

  const approve = await fetch(`${BASE}/api/admin/owner-applications/${app!.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: "{}"
  });
  check("approve", approve.status < 300, String(approve.status));
  const roleFinal = await prisma.user.findUnique({ where: { id: user.id } });
  check("role_owner", roleFinal?.role === "OWNER", String(roleFinal?.role));
  app = await prisma.ownerApplication.findUnique({ where: { id: app!.id } });
  check("db.approved", app?.status === "APPROVED", String(app?.status));

  const dash = await fetch(`${BASE}/dashboard/owner`, { headers: { Cookie: guestCookie }, redirect: "manual" });
  check("owner_dashboard", [200, 302, 307].includes(dash.status), String(dash.status));

  await prisma.ownerApplication.deleteMany({ where: { userId: user.id } });
  await prisma.session.deleteMany({ where: { userId: { in: [user.id, admin.id, 3] } } });
  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await prisma.$disconnect();
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
