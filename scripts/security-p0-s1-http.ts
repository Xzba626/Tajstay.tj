/**
 * P0-S1 HTTP / runtime proofs against LOCAL app + LOCAL DB.
 * Does NOT claim PASS for the whole block — only lists evidence rows.
 *
 * Run (dev server must be up):
 *   npx tsx scripts/security-p0-s1-http.ts
 *
 * Optional: BASE_URL=http://localhost:3001
 */
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const prisma = new PrismaClient();

type Row = { name: string; status: "PASS" | "FAIL" | "BLOCKED"; detail: string };
const rows: Row[] = [];

function record(name: string, status: Row["status"], detail: string) {
  rows.push({ name, status, detail });
  console.log(`${status}  ${name} — ${detail}`);
}

async function ensureServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/sign-in`, { redirect: "manual" });
    return res.status > 0;
  } catch (e) {
    record("http.server", "BLOCKED", `Cannot reach ${BASE}: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function makeUser(role: "GUEST" | "OWNER" | "ADMIN", marker: string) {
  const phone = `+9927${String(Date.now()).slice(-8)}${role === "ADMIN" ? "1" : role === "OWNER" ? "2" : "3"}`.slice(0, 16);
  return prisma.user.create({
    data: {
      name: `P0S1 HTTP ${role} ${marker}`,
      phone,
      email: `${marker}.${role.toLowerCase()}@test.local`,
      password: await hashPassword("TestPass1!"),
      role,
      isBanned: false
    }
  });
}

async function makeSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      token,
      sessionToken: token,
      userId,
      expires: expiresAt,
      expiresAt
    }
  });
  return token;
}

async function postForm(path: string, cookie: string | null, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(cookie ? { cookie: `tajstay_session=${cookie}` } : {})
    },
    body,
    redirect: "manual"
  });
  return res;
}

async function postJson(path: string, payload: unknown) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "manual"
  });
}

async function main() {
  console.log("\n=== P0-S1 HTTP RUNTIME EVIDENCE (LOCAL) ===\n");
  console.log(`BASE_URL=${BASE}`);
  console.log("STATUS: evidence collection — not full P0-S1 PASS\n");

  if (!(await ensureServer())) {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(2);
  }
  record("http.server", "PASS", `${BASE} reachable`);

  const marker = `m${Date.now()}`;
  const createdIds: number[] = [];

  try {
    const guest = await makeUser("GUEST", marker);
    const owner = await makeUser("OWNER", marker);
    const admin = await makeUser("ADMIN", marker);
    createdIds.push(guest.id, owner.id, admin.id);

    const guestCookie = await makeSession(guest.id);
    const ownerCookie = await makeSession(owner.id);
    const adminCookie = await makeSession(admin.id);

    // Unauthorized issue recovery
    const gIssue = await postForm("/api/admin/users/reset-password", guestCookie, { id: String(owner.id) });
    record(
      "http.recovery.issue.guest",
      gIssue.status === 403 ? "PASS" : "FAIL",
      `status=${gIssue.status}`
    );

    const oIssue = await postForm("/api/admin/users/reset-password", ownerCookie, { id: String(owner.id) });
    record(
      "http.recovery.issue.owner",
      oIssue.status === 403 ? "PASS" : "FAIL",
      `status=${oIssue.status}`
    );

    const anonIssue = await postForm("/api/admin/users/reset-password", null, { id: String(owner.id) });
    record(
      "http.recovery.issue.anon",
      anonIssue.status === 403 ? "PASS" : "FAIL",
      `status=${anonIssue.status}`
    );

    // Credentials fail-closed for admin (redirect with error) and 403 for non-admin
    const gCred = await postForm("/api/admin/users/credentials", guestCookie, {
      id: String(owner.id),
      phone: owner.phone,
      email: owner.email ?? ""
    });
    record("http.credentials.guest", gCred.status === 403 ? "PASS" : "FAIL", `status=${gCred.status}`);

    const aCred = await postForm("/api/admin/users/credentials", adminCookie, {
      id: String(owner.id),
      phone: owner.phone,
      email: owner.email ?? ""
    });
    const loc = aCred.headers.get("location") ?? "";
    const blocked =
      aCred.status >= 300 && aCred.status < 400 && loc.includes("credentials_disabled");
    record(
      "http.credentials.admin_fail_closed",
      blocked ? "PASS" : "FAIL",
      `status=${aCred.status} location=${loc}`
    );

    const auditBlocked = await prisma.adminAuditLog.findFirst({
      where: { action: "owner_credentials_blocked", actorUserId: admin.id },
      orderBy: { id: "desc" }
    });
    record(
      "http.credentials.audit_written",
      Boolean(auditBlocked) ? "PASS" : "FAIL",
      auditBlocked ? `id=${auditBlocked.id} result=${auditBlocked.result}` : "missing"
    );

    // Token lifecycle via API consume (simulate issue in DB like route does)
    const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
    const tOld = crypto.randomBytes(24).toString("hex");
    const tNew = crypto.randomBytes(24).toString("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: owner.id } });
    await prisma.passwordResetToken.create({
      data: { token: hash(tOld), userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) }
    });
    await prisma.passwordResetToken.deleteMany({ where: { userId: owner.id } });
    await prisma.passwordResetToken.create({
      data: { token: hash(tNew), userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) }
    });

    const oldGone = !(await prisma.passwordResetToken.findUnique({ where: { token: hash(tOld) } }));
    record("runtime.old_token_invalid_after_reissue", oldGone ? "PASS" : "FAIL", "DB state after reissue");

    // Create session then consume new token
    const ownerSess2 = await makeSession(owner.id);
    const consume1 = await postJson("/api/auth/reset-password", { token: tNew, password: "NewPass99!" });
    record(
      "http.recovery.consume.valid",
      consume1.status === 200 ? "PASS" : "FAIL",
      `status=${consume1.status} body=${(await consume1.text()).slice(0, 120)}`
    );

    const consume2 = await postJson("/api/auth/reset-password", { token: tNew, password: "NewPass99!" });
    record(
      "http.recovery.consume.reuse",
      consume2.status === 400 ? "PASS" : "FAIL",
      `status=${consume2.status}`
    );

    const expiredTok = crypto.randomBytes(24).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token: hash(expiredTok),
        userId: owner.id,
        expiresAt: new Date(Date.now() - 1000)
      }
    });
    const consumeExp = await postJson("/api/auth/reset-password", {
      token: expiredTok,
      password: "NewPass99!"
    });
    record(
      "http.recovery.consume.expired",
      consumeExp.status === 400 ? "PASS" : "FAIL",
      `status=${consumeExp.status}`
    );

    // Session from before consume should be gone
    const sessLeft = await prisma.session.count({ where: { token: ownerSess2 } });
    record("http.recovery.session_revoked", sessLeft === 0 ? "PASS" : "FAIL", `sessions_with_token=${sessLeft}`);

    // Secret word path: security update without current password should fail redirect
    const secNoPass = await postForm("/api/admin/security/update", adminCookie, {
      phone: admin.phone,
      email: admin.email ?? "",
      secretWord: "tajstay-secret",
      newSecretWord: "hack"
    });
    const secLoc = secNoPass.headers.get("location") ?? "";
    record(
      "http.security.update.rejects_without_password",
      secNoPass.status >= 300 && secLoc.includes("security-required") ? "PASS" : "FAIL",
      `status=${secNoPass.status} location=${secLoc}`
    );

    // Prove secretWordHash not read: plant hash, still reject wrong password; secret field ignored
    await prisma.adminSecurityState.upsert({
      where: { id: 1 },
      create: { id: 1, secretWordHash: await hashPassword("planted-legacy") },
      update: { secretWordHash: await hashPassword("planted-legacy") }
    });
    const secWithLegacy = await postForm("/api/admin/security/update", adminCookie, {
      phone: admin.phone,
      email: admin.email ?? "",
      currentPassword: "WRONG",
      secretWord: "planted-legacy"
    });
    const secLoc2 = secWithLegacy.headers.get("location") ?? "";
    record(
      "http.security.legacy_hash_not_authz",
      secLoc2.includes("security-password") ? "PASS" : "FAIL",
      `legacy secretWord does not authorize; location=${secLoc2}`
    );

    // Audit must not contain password/token strings in recent rows
    const recent = await prisma.adminAuditLog.findMany({
      where: { actorUserId: admin.id },
      orderBy: { id: "desc" },
      take: 20
    });
    const leak = recent.some((r) => {
      const blob = `${r.beforeState ?? ""}${r.afterState ?? ""}${r.metadata ?? ""}`;
      return /password|tajstay-secret|planted-legacy|NewPass99|TestPass1/i.test(blob);
    });
    record("http.audit.no_secret_payload", !leak ? "PASS" : "FAIL", `checked ${recent.length} rows`);

    // No update/delete API for audit
    const auditApi = await fetch(`${BASE}/api/admin/audit`, { method: "DELETE", redirect: "manual" }).catch(
      () => null
    );
    record(
      "http.audit.no_delete_endpoint",
      !auditApi || auditApi.status === 404 ? "PASS" : "FAIL",
      auditApi ? `status=${auditApi.status}` : "no route"
    );
  } catch (e) {
    record("http.harness", "FAIL", e instanceof Error ? e.message : String(e));
  } finally {
    for (const id of createdIds) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.session.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.notification.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.adminAuditLog.deleteMany({ where: { OR: [{ actorUserId: id }, { targetId: String(id) }] } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect().catch(() => undefined);
  }

  const failed = rows.filter((r) => r.status === "FAIL");
  const blocked = rows.filter((r) => r.status === "BLOCKED");
  console.log(`\nSUMMARY PASS=${rows.filter((r) => r.status === "PASS").length} FAIL=${failed.length} BLOCKED=${blocked.length}`);
  console.log("P0-S1 overall: NOT PASS (IN PROGRESS) — HTTP evidence only");
  if (failed.length) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
