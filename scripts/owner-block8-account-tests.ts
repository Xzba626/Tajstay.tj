/**
 * BLOCK 8 — account flows (local DB proofs).
 * Run: npx tsx scripts/owner-block8-account-tests.ts
 */
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { changeAccountPassword } from "../src/lib/auth/changePassword";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

async function emailChain() {
  const { prisma } = await import("../src/lib/prisma");
  const { startEmailChangeChallenge, verifyEmailChange } = await import("../src/lib/auth/emailChange");
  const { generateOtpCode, hashOtpCode } = await import("../src/lib/auth/otp");

  const tag = `b8-${Date.now()}@tajstay.local`;
  const user = await prisma.user.create({
    data: {
      email: `old-${tag}`,
      name: "B8 Test",
      password: await hashPassword("OldPass123!"),
      role: "GUEST",
      phone: "+992900000008"
    }
  });

  try {
    const code = generateOtpCode();
    const newEmail = `new-${tag}`;
    await prisma.emailOtp.create({
      data: {
        userId: user.id,
        email: newEmail,
        codeHash: hashOtpCode(code),
        purpose: "EMAIL_CHANGE",
        expiresAt: new Date(Date.now() + 5 * 60_000)
      }
    });

    const verified = await verifyEmailChange({ userId: user.id, newEmail, code });
    check("email.verify_ok", verified.ok === true, verified.ok ? newEmail : String((verified as { error?: string }).error));

    const reloaded = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    check("email.user_updated", reloaded?.email === newEmail, reloaded?.email ?? "");

    const dup = await startEmailChangeChallenge({ userId: user.id, newEmail: `other-${tag}` });
    check("email.challenge_after_change", dup.ok === true || dup.error === "email_not_configured", JSON.stringify(dup));
  } finally {
    await prisma.emailOtp.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

async function passwordChain() {
  const { prisma } = await import("../src/lib/prisma");
  const user = await prisma.user.create({
    data: {
      email: `pw-b8-${Date.now()}@tajstay.local`,
      name: "PW B8",
      password: await hashPassword("StartPass123!"),
      role: "GUEST",
      phone: "+992900000009"
    }
  });

  const s1 = await prisma.session.create({
    data: {
      userId: user.id,
      token: `t1-${Date.now()}`,
      sessionToken: `t1-${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000),
      expires: new Date(Date.now() + 86400000)
    }
  });
  const s2 = await prisma.session.create({
    data: {
      userId: user.id,
      token: `t2-${Date.now()}`,
      sessionToken: `t2-${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000),
      expires: new Date(Date.now() + 86400000)
    }
  });

  try {
    const bad = await changeAccountPassword({
      userId: user.id,
      currentPassword: "wrong",
      newPassword: "NewPass123!",
      keepSessionId: s1.id
    });
    check("password.bad_rejected", bad.ok === false && bad.error === "bad_password", bad.ok ? "ok" : bad.error);

    const good = await changeAccountPassword({
      userId: user.id,
      currentPassword: "StartPass123!",
      newPassword: "NewPass123!",
      keepSessionId: s1.id
    });
    check("password.changed", good.ok === true, String(good.ok));

    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
    check("password.hash_updated", Boolean(u?.password && (await verifyPassword("NewPass123!", u.password))), "verify");

    const remaining = await prisma.session.count({ where: { userId: user.id } });
    check("password.revoked_other_sessions", remaining === 1, String(remaining));
    const kept = await prisma.session.findUnique({ where: { id: s1.id } });
    check("password.kept_current", Boolean(kept), String(s2.id));
  } finally {
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("\n=== BLOCK 8 ACCOUNT TESTS ===\n");
  await emailChain();
  await passwordChain();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) process.exit(1);
}

void main();
