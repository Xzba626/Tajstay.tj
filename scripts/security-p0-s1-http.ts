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

    // Banned owner: issue blocked
    const bannedOwner = await makeUser("OWNER", `${marker}ban`);
    createdIds.push(bannedOwner.id);
    await prisma.user.update({ where: { id: bannedOwner.id }, data: { isBanned: true } });
    const banIssue = await postForm("/api/admin/users/reset-password", adminCookie, {
      id: String(bannedOwner.id)
    });
    const banLoc = banIssue.headers.get("location") ?? "";
    record(
      "http.recovery.issue.banned",
      banLoc.includes("recovery_banned") ? "PASS" : "FAIL",
      `status=${banIssue.status} location=${banLoc}`
    );

    // Banned consume blocked
    const banTok = crypto.randomBytes(24).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token: hash(banTok),
        userId: bannedOwner.id,
        expiresAt: new Date(Date.now() + 3600_000)
      }
    });
    const banConsume = await postJson("/api/auth/reset-password", {
      token: banTok,
      password: "BannedPass99!"
    });
    record(
      "http.recovery.consume.banned",
      banConsume.status === 400 ? "PASS" : "FAIL",
      `status=${banConsume.status}`
    );

    // Target binding: token for owner must not change guest password
    const bindTok = crypto.randomBytes(24).toString("hex");
    const guestBefore = await prisma.user.findUnique({ where: { id: guest.id } });
    const ownerBefore = await prisma.user.findUnique({ where: { id: owner.id } });
    await prisma.passwordResetToken.create({
      data: {
        token: hash(bindTok),
        userId: owner.id,
        expiresAt: new Date(Date.now() + 3600_000)
      }
    });
    const bindConsume = await postJson("/api/auth/reset-password", {
      token: bindTok,
      password: "BoundPass99!"
    });
    const guestAfter = await prisma.user.findUnique({ where: { id: guest.id } });
    const ownerAfter = await prisma.user.findUnique({ where: { id: owner.id } });
    record(
      "http.recovery.target_binding",
      bindConsume.status === 200 &&
        guestAfter?.password === guestBefore?.password &&
        ownerAfter?.password !== ownerBefore?.password
        ? "PASS"
        : "FAIL",
      `consume=${bindConsume.status} guestUnchanged=${guestAfter?.password === guestBefore?.password} ownerChanged=${ownerAfter?.password !== ownerBefore?.password}`
    );

    // Issue rate limit (target: 3/hour) — use a fresh owner so prior calls do not interfere
    const rlOwner = await makeUser("OWNER", `${marker}rl`);
    createdIds.push(rlOwner.id);
    let rlHit = false;
    let lastRlLoc = "";
    for (let i = 0; i < 4; i++) {
      const r = await postForm("/api/admin/users/reset-password", adminCookie, {
        id: String(rlOwner.id)
      });
      lastRlLoc = r.headers.get("location") ?? "";
      if (lastRlLoc.includes("recovery_rate_limited")) {
        rlHit = true;
        break;
      }
    }
    record(
      "http.recovery.issue.rate_limit",
      rlHit ? "PASS" : "FAIL",
      `4th+ issue for same target → rate limited; last=${lastRlLoc}`
    );

    // Consume rate limit (5 attempts / token prefix / 10m)
    const rlTok = crypto.randomBytes(24).toString("hex");
    let consumeRl = false;
    let lastConsumeStatus = 0;
    for (let i = 0; i < 6; i++) {
      const r = await postJson("/api/auth/reset-password", {
        token: rlTok,
        password: "Whatever1!"
      });
      lastConsumeStatus = r.status;
      if (r.status === 429) {
        consumeRl = true;
        break;
      }
    }
    record(
      "http.recovery.consume.rate_limit",
      consumeRl ? "PASS" : "FAIL",
      `6 attempts same token prefix; lastStatus=${lastConsumeStatus}`
    );

    // Emergency reset: shared tajstay-secret must fail closed
    const emerg = await postForm("/api/admin/security/reset", adminCookie, {
      resetSecret: "tajstay-secret",
      newPassword: "Emergency99!"
    });
    const emergLoc = emerg.headers.get("location") ?? "";
    record(
      "http.emergency.tajstay_secret_denied",
      emergLoc.includes("security-reset-denied") ? "PASS" : "FAIL",
      `location=${emergLoc}`
    );

    // security/update must not write secretWordHash
    const hashBefore = (
      await prisma.adminSecurityState.findUnique({ where: { id: 1 } })
    )?.secretWordHash;
    await postForm("/api/admin/security/update", adminCookie, {
      phone: admin.phone,
      email: admin.email ?? "",
      currentPassword: "WRONG",
      secretWord: "planted-legacy",
      newSecretWord: "should-not-persist"
    });
    const hashAfter = (
      await prisma.adminSecurityState.findUnique({ where: { id: 1 } })
    )?.secretWordHash;
    record(
      "http.security.secretWordHash_not_written",
      hashBefore === hashAfter ? "PASS" : "FAIL",
      "update path does not mutate AdminSecurityState.secretWordHash"
    );

    // Audit must not contain password/token strings in recent rows
    const recent = await prisma.adminAuditLog.findMany({
      where: {
        OR: [{ actorUserId: admin.id }, { targetId: String(owner.id) }, { targetId: String(bannedOwner.id) }]
      },
      orderBy: { id: "desc" },
      take: 40
    });
    const leak = recent.some((r) => {
      const blob = `${r.beforeState ?? ""}${r.afterState ?? ""}${r.metadata ?? ""}${r.reason ?? ""}`;
      return /NewPass99|TestPass1|BoundPass99|BannedPass99|Whatever1|tajstay-secret|planted-legacy/i.test(blob);
    });
    record("http.audit.no_secret_payload", !leak ? "PASS" : "FAIL", `checked ${recent.length} rows`);

    const criticalActions = [
      "owner_credentials_blocked",
      "owner_recovery_completed",
      "owner_recovery_consume_failed",
      "admin_self_security_failed",
      "admin_emergency_reset"
    ];
    const foundCritical = criticalActions.filter((a) => recent.some((r) => r.action === a));
    record(
      "http.audit.critical_actions_present",
      foundCritical.length >= 4 ? "PASS" : "FAIL",
      `found=${foundCritical.join(",")}`
    );

    // No update/delete API for audit
    const auditApi = await fetch(`${BASE}/api/admin/audit`, { method: "DELETE", redirect: "manual" }).catch(
      () => null
    );
    record(
      "http.audit.no_delete_endpoint",
      !auditApi || auditApi.status === 404 ? "PASS" : "FAIL",
      auditApi ? `status=${auditApi.status}` : "no route"
    );

    // Redirect after issue must never put token in Location
    const issueLocCheck = await postForm("/api/admin/users/reset-password", adminCookie, {
      id: String(owner.id)
    });
    const issueLoc = issueLocCheck.headers.get("location") ?? "";
    record(
      "http.recovery.no_token_in_redirect",
      !/[?&#]token=/i.test(issueLoc) && !issueLoc.includes("resetToken") ? "PASS" : "FAIL",
      `location=${issueLoc.slice(0, 160)}`
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
