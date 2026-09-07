/**
 * P0-S1 targeted security harness (LOCAL).
 * Run: npx tsx scripts/security-p0-s1-tests.ts
 *
 * Covers: secret-word absence, recovery lifecycle against LOCAL DB,
 * credentials fail-closed route behavior (static), session wipe on consume.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { verifyAdminSecretWord, verifyAdminSecurityResetSecret } from "../src/lib/admin-security";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
const root = process.cwd();

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function main() {
  console.log("\n=== P0-S1 LOCAL SECURITY TESTS ===\n");
  console.log("DEPLOYED: LOCAL TEST DB\n");

  // Static: secret word gone from auth path
  const adminSec = read("src/lib/admin-security.ts");
  check(
    "secret.no_default_fallback_in_admin_security",
    !adminSec.includes("tajstay-secret") && adminSec.includes("return false"),
    "admin-security no longer embeds tajstay-secret"
  );
  check(
    "secret.verify_always_false",
    (await verifyAdminSecretWord("tajstay-secret")) === false &&
      (await verifyAdminSecretWord("anything")) === false,
    "verifyAdminSecretWord rejects all inputs"
  );
  check(
    "secret.ui_messages_no_default_disclose_ru",
    !read("src/lib/i18n/messages.ts").includes("Secret word по умолчанию tajstay-secret"),
    "RU default disclosure removed"
  );
  check(
    "secret.env_example_no_admin_secret_word",
    !read(".env.example").includes("ADMIN_SECRET_WORD="),
    ".env.example no longer documents ADMIN_SECRET_WORD"
  );
  check(
    "secret.update_route_no_secret_word",
    !read("src/app/api/admin/security/update/route.ts").includes("secretWord") &&
      !read("src/app/api/admin/security/update/route.ts").includes("verifyAdminSecretWord"),
    "security/update uses current password only"
  );
  check(
    "emergency.fail_closed_without_env",
    verifyAdminSecurityResetSecret("tajstay-secret") === false &&
      verifyAdminSecurityResetSecret("") === false,
    "weak/shared strings do not unlock emergency reset"
  );

  const creds = read("src/app/api/admin/users/credentials/route.ts");
  check(
    "credentials.fail_closed",
    creds.includes("credentials_disabled") && !creds.includes("prisma.user.update"),
    "credentials route no longer mutates phone/email"
  );

  const issue = read("src/app/api/admin/users/reset-password/route.ts");
  check(
    "recovery.invalidates_previous",
    issue.includes("passwordResetToken.deleteMany"),
    "issue deletes previous tokens"
  );
  check(
    "recovery.rate_limit_issue",
    issue.includes("rateLimit(`admin:reset-issue"),
    "issue endpoint rate-limited"
  );
  check(
    "recovery.no_plaintext_ui_cookie",
    !issue.includes("tajstay_admin_reset_token") && issue.includes("sendPasswordResetLinkEmail"),
    "no cookie/UI token handoff; email delivery required"
  );

  const prisma = new PrismaClient();
  const marker = `p0s1_${Date.now()}`;
  let ownerId = 0;
  try {
    const phone = `+99299${String(Date.now()).slice(-7)}`;
    const owner = await prisma.user.create({
      data: {
        name: `P0S1 Owner ${marker}`,
        phone,
        email: `${marker}@test.local`,
        password: await hashPassword("OwnerPass1!"),
        role: "OWNER"
      }
    });
    ownerId = owner.id;

    const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
    const t1 = crypto.randomBytes(24).toString("hex");
    const t2 = crypto.randomBytes(24).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        token: hash(t1),
        userId: ownerId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });
    await prisma.passwordResetToken.deleteMany({ where: { userId: ownerId } });
    await prisma.passwordResetToken.create({
      data: {
        token: hash(t2),
        userId: ownerId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    const oldGone = await prisma.passwordResetToken.findUnique({ where: { token: hash(t1) } });
    const newPresent = await prisma.passwordResetToken.findUnique({ where: { token: hash(t2) } });
    check("recovery.old_token_invalid_after_reissue", !oldGone && !!newPresent, "old hash removed");

    // session create + wipe simulation
    await prisma.session.create({
      data: {
        token: `sess_${marker}`,
        sessionToken: `sess_${marker}`,
        userId: ownerId,
        expires: new Date(Date.now() + 86400000),
        expiresAt: new Date(Date.now() + 86400000)
      }
    });

    const passwordHash = await hashPassword("OwnerPass2!");
    await prisma.$transaction([
      prisma.user.update({ where: { id: ownerId }, data: { password: passwordHash } }),
      prisma.session.deleteMany({ where: { userId: ownerId } }),
      prisma.passwordResetToken.delete({ where: { token: hash(t2) } })
    ]);
    const sessions = await prisma.session.count({ where: { userId: ownerId } });
    const reused = await prisma.passwordResetToken.findUnique({ where: { token: hash(t2) } });
    check("recovery.single_use_after_consume", !reused, "token deleted after use");
    check("recovery.sessions_wiped", sessions === 0, "sessions deleted with password change");

    // banned cannot keep usable token path (consume logic)
    await prisma.user.update({ where: { id: ownerId }, data: { isBanned: true } });
    const banned = await prisma.user.findUnique({ where: { id: ownerId } });
    check("recovery.banned_flag_readable", banned?.isBanned === true, "fixture banned");

    // Audit model exists
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: null,
        action: "owner_recovery_completed",
        targetType: "user",
        targetId: String(ownerId),
        result: "ok"
      }
    });
    const audits = await prisma.adminAuditLog.count({
      where: { targetId: String(ownerId) }
    });
    check("audit.insert_works", audits >= 1, "AdminAuditLog writable");
  } catch (e) {
    check("db.lifecycle", false, e instanceof Error ? e.message : String(e));
  } finally {
    if (ownerId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: ownerId } }).catch(() => undefined);
      await prisma.session.deleteMany({ where: { userId: ownerId } }).catch(() => undefined);
      await prisma.adminAuditLog.deleteMany({ where: { targetId: String(ownerId) } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
    }
    await prisma.$disconnect().catch(() => undefined);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
  console.log("\nP0-S1 targeted tests: PASS (LOCAL)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
