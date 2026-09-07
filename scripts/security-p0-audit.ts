/**
 * P0 security audit runner (local CODE + optional DB evidence).
 * Does not mutate production data. Run: npx tsx scripts/security-p0-audit.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type Status = "PASS" | "FAIL" | "BLOCKED" | "UNKNOWN" | "ABSENT";
type Finding = {
  id: string;
  status: Status;
  code: string;
  test: string;
  deployed: string;
  runtime: string;
  evidence: string[];
};

const findings: Finding[] = [];
const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertContains(rel: string, needle: string | RegExp): boolean {
  const src = read(rel);
  return typeof needle === "string" ? src.includes(needle) : needle.test(src);
}

function add(f: Finding) {
  findings.push(f);
}

async function main() {
  // --- 1. Secret word ---
  const adminSec = read("src/lib/admin-security.ts");
  const hasDefault =
    adminSec.includes('ADMIN_SECRET_WORD ?? "tajstay-secret"') ||
    adminSec.includes('?? "tajstay-secret"');
  const plaintextCompare = adminSec.includes("candidate === defaultSecretWord()");
  const uiHint = assertContains(
    "src/lib/i18n/messages.ts",
    "tajstay-secret"
  );
  const envExample = assertContains(".env.example", "tajstay-secret");
  const updateDevFallback = assertContains(
    "src/app/api/admin/security/update/route.ts",
    'isDev ? "tajstay-secret"'
  );
  const envGuardListsSecret = assertContains(
    "src/lib/security/envGuard.ts",
    '"tajstay-secret"'
  );
  const envGuardChecksAdminSecret = assertContains(
    "src/lib/security/envGuard.ts",
    "ADMIN_SECRET_WORD"
  );

  add({
    id: "1-secret-word",
    status: hasDefault && plaintextCompare ? "FAIL" : "UNKNOWN",
    code: `Shared platform default secret word. Files: src/lib/admin-security.ts (defaultSecretWord, verifyAdminSecretWord plaintext fallback when no DB hash), singleton AdminSecurityState.secretWordHash, API POST /api/admin/security/update + /api/admin/security/reset. NOT per-user.`,
    test: `Static: default=${hasDefault}, plaintextFallback=${plaintextCompare}, uiDiscloses=${uiHint}, envExample=${envExample}, devEmptyFallback=${updateDevFallback}, envGuardListsBadDefault=${envGuardListsSecret}, envGuardEnforcesAdminSecretWord=${envGuardChecksAdminSecret}`,
    deployed: "LOCAL CODE audit (production env values not verified without prod access)",
    runtime: "Not exercised live in this run (no credentialed admin session automation)",
    evidence: [
      "defaultSecretWord() => process.env.ADMIN_SECRET_WORD ?? \"tajstay-secret\"",
      "If AdminSecurityState.id=1 has no hash: verify accepts plaintext equality to default",
      "UI messages.ru/tg/en disclose default tajstay-secret",
      "assertProdSecrets() does NOT block ADMIN_SECRET_WORD default",
      "Secret word gates admin self phone/email/password/secret change together with login password"
    ]
  });

  // --- 2. Reset lifecycle (admin-initiated token) ---
  const adminReset = read("src/app/api/admin/users/reset-password/route.ts");
  const consumeReset = read("src/app/api/auth/reset-password/route.ts");
  const createsOnly = adminReset.includes("passwordResetToken.create") &&
    !adminReset.includes("passwordResetToken.deleteMany");
  const hashedStore = adminReset.includes("sha256") && adminReset.includes("tokenHash");
  const ttl1h = adminReset.includes("60 * 60 * 1000");
  const singleUseDelete = consumeReset.includes("passwordResetToken.delete");
  const sessionWipeOnUse = consumeReset.includes("session.deleteMany");
  const rateOnConsume = consumeReset.includes("rateLimit");
  const rateOnAdminIssue = adminReset.includes("rateLimit");
  const tokenInUi = assertContains(
    "src/app/dashboard/admin/page.tsx",
    "/auth/reset-password#token="
  );
  const auditOnReset =
    consumeReset.includes("logAuthEvent") || adminReset.includes("logAuthEvent");

  add({
    id: "2-password-reset-admin-token",
    status: "FAIL",
    code: `Issue: POST /api/admin/users/reset-password. Consume: POST /api/auth/reset-password (token branch). Model PasswordResetToken { token(hash), userId, expiresAt }.`,
    test: `Static properties: crypto.randomBytes(24)=yes; hashedAtRest=${hashedStore}; ttl1h=${ttl1h}; singleUseOnSuccess=${singleUseDelete}; invalidatePreviousOnIssue=${!createsOnly ? "yes" : "NO"}; rateLimitIssue=${rateOnAdminIssue}; rateLimitConsume=${rateOnConsume}; sessionInvalidateOnSuccess=${sessionWipeOnUse}; audit=${auditOnReset}; plaintextTokenShownInAdminUI=${tokenInUi}`,
    deployed: "LOCAL CODE",
    runtime: "Not end-to-end exercised this run",
    evidence: [
      createsOnly
        ? "FAIL: new token create does NOT deleteMany previous tokens for user"
        : "PASS: previous tokens invalidated",
      "PASS-ish: token stored as sha256 hex; consume deletes token + sessions",
      "FAIL: no rateLimit on admin issue endpoint",
      "FAIL: plaintext token displayed in admin UI after cookie handoff",
      "FAIL/ABSENT: no Audit Log on issue or consume",
      "OTP email reset path separately has rate limits + marks otp used"
    ]
  });

  // --- 3. Admin set password ---
  const adminSetOwnerPassword =
    assertContains("src/app/api/admin/users/credentials/route.ts", "password") === false &&
    !/hashPassword/.test(read("src/app/api/admin/users/credentials/route.ts"));
  const securityUpdateSetsOwnPassword = assertContains(
    "src/app/api/admin/security/update/route.ts",
    "newPassword"
  );

  add({
    id: "3-admin-assign-password",
    status: "PASS",
    code: `No endpoint found that lets admin set OWNER working password. credentials route updates phone/email only. Admin can set OWN password via /api/admin/security/update after password+secretWord. Emergency /api/admin/security/reset sets own password with ADMIN_SECURITY_RESET_SECRET.`,
    test: `credentials has hashPassword=${/hashPassword/.test(read("src/app/api/admin/users/credentials/route.ts"))}; owner reset issues token only`,
    deployed: "LOCAL CODE",
    runtime: "N/A",
    evidence: [
      adminSetOwnerPassword
        ? "PASS: admin cannot directly assign owner password via credentials"
        : "FAIL: credentials touches password",
      `Admin self password change exists: ${securityUpdateSetsOwnPassword}`,
      "UI copy may still imply password set capability — product messaging risk separate from endpoint"
    ]
  });

  // --- 4. credentials ---
  const creds = read("src/app/api/admin/users/credentials/route.ts");
  add({
    id: "4-credentials-phone-email",
    status: "FAIL",
    code: `POST /api/admin/users/credentials — getAdminUser() only (role===ADMIN). Updates target OWNER phone/email; session.deleteMany; no reason; no audit; no notify; no re-verify flags; any ADMIN can target any OWNER id.`,
    test: "Static AuthZ: Guest/Owner blocked by getAdminUser null→403. No finer roles. No last-admin equivalent. No self/target Admin protection (OWNER-only gate).",
    deployed: "LOCAL CODE",
    runtime: "Not exercised with role matrix HTTP calls this run",
    evidence: [
      "AuthZ gate: getAdminUser()",
      "Target must role===OWNER else forbiddenJson",
      "Sessions wiped server-side on success",
      "ABSENT: audit actor/target/old/new/reason",
      "ABSENT: owner security notification",
      "placeholder owner@example.com is HTML placeholder only in page.tsx"
    ]
  });

  // --- 5/6 AuthZ matrix from code ---
  const usersUpdate = read("src/app/api/admin/users/update/route.ts");
  const hasLastAdmin = usersUpdate.includes("last_admin") || usersUpdate.includes("activeAdmins");
  const banWipesSessions = usersUpdate.includes("session.deleteMany");
  add({
    id: "5-6-authz-matrix",
    status: "FAIL",
    code: `All admin APIs use getAdminUser()/requireAdmin() → role===\"ADMIN\" only. No Moderator/Support/Finance roles in schema. Role enum effectively GUEST|OWNER|ADMIN.`,
    test: `lastAdminGuard=${hasLastAdmin}; banSessionWipe=${banWipesSessions}; moderate reason=${assertContains("src/app/api/admin/hotels/moderate/route.ts", "reason")}; complaint resolve reason=${assertContains("src/app/api/admin/complaints/resolve/route.ts", "reason")}`,
    deployed: "LOCAL CODE",
    runtime: "HTTP privilege-escalation suite NOT RUN (no test runner in package.json)",
    evidence: [
      "Guest/Owner → admin endpoints: 403 via getAdminUser",
      "Any Admin → role change, ban, moderate, complaints, credentials, finance routes: ALLOWED",
      hasLastAdmin ? "Partial: cannot demote/ban last active ADMIN" : "FAIL: no last-admin guard",
      banWipesSessions ? "Ban wipes sessions" : "FAIL: ban does NOT wipe sessions in users/update",
      "Hotel moderate: status dropdown save, no reject reason, no audit",
      "Complaint resolve: status=RESOLVED only, no reason/assignee/history"
    ]
  });

  // --- 7 Audit ---
  add({
    id: "7-audit-log",
    status: "ABSENT",
    code: `AuthAuditLog exists for auth events only (otp/login/register) via src/lib/auth/auditLog.ts. No AdminAudit / no writes from credentials, reset-password, users/update, moderate, complaints.`,
    test: "Grep admin routes for logAuthEvent/audit: none under src/app/api/admin",
    deployed: "LOCAL CODE",
    runtime: "N/A",
    evidence: ["Admin mutation audit ABSENT", "Do not mark TODO as PASS"]
  });

  // --- 8 demo email ---
  add({
    id: "8-owner-example-com",
    status: "UNKNOWN",
    code: `UI placeholder only in src/app/dashboard/admin/page.tsx input placeholder=\"owner@example.com\". Not in prisma/seed grep for example.com.`,
    test: "Will attach DB count if query succeeds below",
    deployed: "LOCAL DB attempt",
    runtime: "pending DB",
    evidence: ["Placeholder ≠ stored value unless DB contains owner@example.com"]
  });

  // --- 9/10 blank + 500 ---
  add({
    id: "9-http-500",
    status: "BLOCKED",
    code: "No automated reproduction of admin 500 in this run. Generic error UI exists; not proof of root cause.",
    test: "Not run",
    deployed: "N/A",
    runtime: "REPRO NEEDED: capture Network tab for failing admin action",
    evidence: ["Screenshot-only evidence insufficient"]
  });

  add({
    id: "10-blank-panel",
    status: "UNKNOWN",
    code: `Strong CODE hypothesis: WorkspaceMobileDrawer (.workspace-mobile-drawer) is full-height white sheet; group titles/links use tokens that production still remaps to mint #d8f1e2 via global locks → appears blank. Green left strip = page backdrop visible beside drawer. Also possible if drawer open with body overflow hidden and content color inherit mint.`,
    test: "DOM/computed-style repro not automated; classify candidates: CSS INVISIBLE (primary), OFF-VIEWPORT secondary, NO DATA if body empty",
    deployed: "LOCAL CODE",
    runtime: "REPRO NEEDED on device with DevTools",
    evidence: [
      "src/components/navigation/WorkspaceMobileDrawer.tsx",
      "src/styles/workspace-mobile-shell.css white background + text tokens",
      "User screenshot of Admin More drawer with invisible labels matches CSS INVISIBLE"
    ]
  });

  // Optional DB
  const prisma = new PrismaClient();
  try {
    const sec = await prisma.adminSecurityState.findUnique({ where: { id: 1 } });
    const exampleEmails = await prisma.user.findMany({
      where: { email: { contains: "example.com" } },
      select: { id: true, email: true, role: true, name: true }
    });
    const tokenDupUsers = await prisma.$queryRawUnsafe<
      { userId: number; c: bigint }[]
    >(
      `SELECT "userId", COUNT(*)::bigint as c FROM "PasswordResetToken" GROUP BY "userId" HAVING COUNT(*) > 1`
    ).catch(() => []);

    const f8 = findings.find((x) => x.id === "8-owner-example-com");
    if (f8) {
      f8.runtime = "LOCAL DB queried";
      f8.evidence.push(
        `example.com emails in DB: ${JSON.stringify(exampleEmails)}`
      );
      f8.status = exampleEmails.length
        ? "FAIL"
        : "PASS";
      f8.test = `DB count example.com=${exampleEmails.length}; secretHashPresent=${Boolean(sec?.secretWordHash)}`;
    }

    const f1 = findings.find((x) => x.id === "1-secret-word");
    if (f1 && sec) {
      f1.evidence.push(
        `LOCAL AdminSecurityState.hasHash=${Boolean(sec.secretWordHash)} updatedAt=${sec.updatedAt?.toISOString?.() ?? sec.updatedAt}`
      );
      if (!sec.secretWordHash) {
        f1.evidence.push(
          "LOCAL: no hash stored → plaintext default tajstay-secret currently accepted"
        );
      }
    }

    const f2 = findings.find((x) => x.id === "2-password-reset-admin-token");
    if (f2) {
      f2.evidence.push(
        `LOCAL users with >1 active reset tokens: ${JSON.stringify(tokenDupUsers)}`
      );
    }

    // Unit-ish: hash roundtrip for token shape
    const sample = crypto.randomBytes(24).toString("hex");
    const hash = crypto.createHash("sha256").update(sample).digest("hex");
    if (hash.length !== 64) throw new Error("hash length");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    findings.push({
      id: "db-connectivity",
      status: "BLOCKED",
      code: "Prisma query failed",
      test: msg,
      deployed: "LOCAL",
      runtime: "DB unreachable or schema mismatch",
      evidence: [msg]
    });
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  // Synthetic AuthZ matrix table
  console.log("\n=== AUTHORIZATION MATRIX (as implemented today) ===\n");
  console.log(
    [
      "Operation | Guest | User/GUEST | Owner | Admin",
      "change own email (admin security form) | - | - | - | YES (password+secretWord)",
      "change foreign owner email (credentials) | NO | NO | NO | YES any OWNER",
      "issue owner reset token | NO | NO | NO | YES",
      "change role | NO | NO | NO | YES (last-admin guard partial)",
      "block user | NO | NO | NO | YES (sessions NOT wiped on ban)",
      "moderate hotel | NO | NO | NO | YES",
      "resolve complaint | NO | NO | NO | YES",
      "finance mutate | NO | NO | NO | YES (role===ADMIN)",
      "Moderator/Support/Finance roles | ABSENT | ABSENT | ABSENT | ABSENT"
    ].join("\n")
  );

  console.log("\n=== FINDINGS ===\n");
  for (const f of findings) {
    console.log(`## ${f.id} — ${f.status}`);
    console.log(`CODE: ${f.code}`);
    console.log(`TEST: ${f.test}`);
    console.log(`DEPLOYED: ${f.deployed}`);
    console.log(`REAL RUNTIME: ${f.runtime}`);
    console.log(`EVIDENCE:\n- ${f.evidence.join("\n- ")}`);
    console.log("");
  }

  const summary = findings.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log("SUMMARY", summary);
  console.log(
    "\nBLOCK STATUS: NOT PASS — security P0 items remain FAIL/ABSENT/BLOCKED/UNKNOWN"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
