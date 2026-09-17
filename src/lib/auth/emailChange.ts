import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode, verifyOtpCodeHash } from "@/lib/auth/otp";
import { sendEmailChangeOtpEmail } from "@/lib/email/sendEmailChangeOtp";

export const EMAIL_CHANGE_PURPOSE = "EMAIL_CHANGE";
/** MASTER FINAL §42 — 5 minutes. */
export const EMAIL_CHANGE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

export type EmailChangeChallengeResult =
  | { ok: true; expiresAt: string }
  | { ok: false; error: string; status: number };

export async function startEmailChangeChallenge(input: {
  userId: number;
  newEmail: string;
}): Promise<EmailChangeChallengeResult> {
  const newEmail = input.newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { ok: false, error: "invalid_email", status: 400 };
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { ok: false, error: "unauthorized", status: 401 };

  if (user.email && user.email.trim().toLowerCase() === newEmail) {
    return { ok: false, error: "same_email", status: 400 };
  }

  const taken = await prisma.user.findFirst({
    where: { email: newEmail, NOT: { id: input.userId } },
    select: { id: true }
  });
  if (taken) return { ok: false, error: "email_taken", status: 409 };

  const last = await prisma.emailOtp.findFirst({
    where: { userId: input.userId, purpose: EMAIL_CHANGE_PURPOSE, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "cooldown", status: 429 };
  }

  await prisma.emailOtp.updateMany({
    where: { userId: input.userId, purpose: EMAIL_CHANGE_PURPOSE, usedAt: null },
    data: { usedAt: new Date() }
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MS);
  const otp = await prisma.emailOtp.create({
    data: {
      userId: input.userId,
      email: newEmail,
      codeHash: hashOtpCode(code),
      purpose: EMAIL_CHANGE_PURPOSE,
      expiresAt,
      attempts: 0
    }
  });

  const sent = await sendEmailChangeOtpEmail({ to: newEmail, code });
  if (!sent.ok) {
    await prisma.emailOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
    return {
      ok: false,
      error: sent.skipped ? "email_not_configured" : "delivery_failed",
      status: sent.skipped ? 503 : 502
    };
  }

  return { ok: true, expiresAt: expiresAt.toISOString() };
}

export type EmailChangeVerifyResult =
  | { ok: true; email: string }
  | { ok: false; error: string; status: number };

export async function verifyEmailChange(input: {
  userId: number;
  newEmail: string;
  code: string;
}): Promise<EmailChangeVerifyResult> {
  const newEmail = input.newEmail.trim().toLowerCase();
  const code = String(input.code ?? "").trim();

  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId: input.userId,
      email: newEmail,
      purpose: EMAIL_CHANGE_PURPOSE,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otp) return { ok: false, error: "invalid_or_expired", status: 400 };
  if ((otp.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { ok: false, error: "too_many_attempts", status: 429 };
  }

  if (!verifyOtpCodeHash(code, otp.codeHash)) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: (otp.attempts ?? 0) + 1 }
    });
    return { ok: false, error: "invalid_or_expired", status: 400 };
  }

  const taken = await prisma.user.findFirst({
    where: { email: newEmail, NOT: { id: input.userId } },
    select: { id: true }
  });
  if (taken) return { ok: false, error: "email_taken", status: 409 };

  try {
    await prisma.$transaction([
      prisma.emailOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
      prisma.emailOtp.updateMany({
        where: {
          userId: input.userId,
          purpose: EMAIL_CHANGE_PURPOSE,
          usedAt: null,
          NOT: { id: otp.id }
        },
        data: { usedAt: new Date() }
      }),
      prisma.user.update({
        where: { id: input.userId },
        data: { email: newEmail, emailVerified: new Date(), verified: true }
      })
    ]);
  } catch {
    return { ok: false, error: "update_failed", status: 500 };
  }

  return { ok: true, email: newEmail };
}
