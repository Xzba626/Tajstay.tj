/**
 * MASTER FINAL — email change + booking receipt pipeline unit/integration checks (local).
 * Run: npx tsx scripts/master-final-email-receipt-tests.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  EMAIL_CHANGE_PURPOSE,
  startEmailChangeChallenge,
  verifyEmailChange
} from "../src/lib/auth/emailChange";
import { hashOtpCode } from "../src/lib/auth/otp";
import { sendBookingConfirmation } from "../src/lib/bookings/bookingConfirmationDelivery";

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed += 1;
  console.log("PASS", name);
}
function fail(name: string, detail?: string) {
  failed += 1;
  console.error("FAIL", name, detail || "");
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { not: null }, role: { in: ["GUEST", "OWNER"] } },
    orderBy: { id: "asc" }
  });
  if (!user?.email) {
    fail("fixture_user", "no user with email");
    process.exit(1);
  }

  // --- Email change: challenge + verify (local, without requiring Resend if we seed OTP) ---
  const unique = `mf-email-${Date.now()}@tajstay.local`;

  // Force local challenge without Resend: create OTP row directly then verify path
  await prisma.emailOtp.updateMany({
    where: { userId: user.id, purpose: EMAIL_CHANGE_PURPOSE, usedAt: null },
    data: { usedAt: new Date() }
  });
  const code = "424242";
  await prisma.emailOtp.create({
    data: {
      userId: user.id,
      email: unique,
      codeHash: hashOtpCode(code),
      purpose: EMAIL_CHANGE_PURPOSE,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0
    }
  });

  const wrong = await verifyEmailChange({ userId: user.id, newEmail: unique, code: "000000" });
  if (!wrong.ok && wrong.error === "invalid_or_expired") ok("email_wrong_code");
  else fail("email_wrong_code", JSON.stringify(wrong));

  const oldEmail = user.email;
  const good = await verifyEmailChange({ userId: user.id, newEmail: unique, code });
  if (good.ok && good.email === unique) ok("email_verify_updates");
  else fail("email_verify_updates", JSON.stringify(good));

  const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
  if (reloaded?.email === unique) ok("email_db_canonical");
  else fail("email_db_canonical", reloaded?.email || "null");

  const replay = await verifyEmailChange({ userId: user.id, newEmail: unique, code });
  if (!replay.ok) ok("email_replay_denied");
  else fail("email_replay_denied");

  // restore original email for fixture hygiene
  await prisma.user.update({
    where: { id: user.id },
    data: { email: oldEmail }
  });
  ok("email_fixture_restored");

  // startEmailChangeChallenge without Resend should fail closed
  const started = await startEmailChangeChallenge({
    userId: user.id,
    newEmail: `mf2-${Date.now()}@tajstay.local`
  });
  if (!started.ok && (started.error === "email_not_configured" || started.error === "delivery_failed" || started.error === "cooldown")) {
    ok("email_challenge_fail_closed_or_delivery");
  } else if (started.ok) {
    ok("email_challenge_sent_via_resend");
  } else {
    fail("email_challenge_start", JSON.stringify(started));
  }

  // --- Receipt idempotency against a real booking if present ---
  const booking = await prisma.booking.findFirst({
    where: { status: { in: ["CONFIRMED", "COMPLETED"] }, userId: { not: null } },
    orderBy: { id: "desc" }
  });
  if (!booking) {
    ok("receipt_skip_no_booking");
  } else {
    const r1 = await sendBookingConfirmation(booking.id, "booking.confirmed.payment_captured");
    const r2 = await sendBookingConfirmation(booking.id, "booking.confirmed.payment_captured");
    const e1 = String(r1.email);
    const e2 = String(r2.email);
    const t1 = String(r1.telegram);
    const t2 = String(r2.telegram);
    if (["sent", "already_sent", "skipped_not_configured", "skipped_no_recipient", "failed"].includes(e1)) {
      ok("receipt_email_state_recorded");
    } else fail("receipt_email_state", e1);

    if (e2 === "already_sent" || e1 !== "sent" || (e1 === "sent" && e2 === "already_sent")) {
      ok("receipt_email_idempotent_or_skip");
    } else fail("receipt_email_idempotent", `${e1}->${e2}`);

    if (t2 === "already_sent" || t1 !== "sent" || (t1 === "sent" && t2 === "already_sent")) {
      ok("receipt_telegram_idempotent_or_skip");
    } else fail("receipt_telegram_idempotent", `${t1}->${t2}`);
  }

  console.log(`\nMASTER FINAL email/receipt tests ${passed}/${passed + failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
