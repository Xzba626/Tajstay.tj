import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode, verifyOtpCodeHash } from "@/lib/auth/otp";
import { sendChangeEmailOtpEmail } from "@/lib/email/sendChangeEmailOtp";

export const CHANGE_EMAIL_PURPOSE = "CHANGE_EMAIL";
const OTP_EXPIRES_MS = 10 * 60 * 1000;

export async function requestProfileEmailChange(userId: number, newEmailRaw: string) {
  const newEmail = newEmailRaw.trim().toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const taken = await prisma.user.findFirst({
    where: { email: newEmail, NOT: { id: userId } },
    select: { id: true }
  });
  if (taken) return { ok: false as const, reason: "taken" as const };

  await prisma.emailOtp.updateMany({
    where: { userId, purpose: CHANGE_EMAIL_PURPOSE, usedAt: null },
    data: { usedAt: new Date() }
  });

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  const otp = await prisma.emailOtp.create({
    data: { userId, email: newEmail, codeHash, purpose: CHANGE_EMAIL_PURPOSE, expiresAt }
  });

  const sent = await sendChangeEmailOtpEmail({ to: newEmail, code });
  if (!sent.ok) {
    await prisma.emailOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
    return { ok: false as const, reason: "send_failed" as const };
  }

  return { ok: true as const, email: newEmail };
}

export async function confirmProfileEmailChange(userId: number, newEmailRaw: string, code: string) {
  const newEmail = newEmailRaw.trim().toLowerCase();
  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId,
      email: newEmail,
      purpose: CHANGE_EMAIL_PURPOSE,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otp) return { ok: false as const, reason: "invalid" as const };
  if ((otp.attempts ?? 0) >= 5) return { ok: false as const, reason: "too_many" as const };

  if (!verifyOtpCodeHash(code, otp.codeHash)) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: (otp.attempts ?? 0) + 1 }
    });
    return { ok: false as const, reason: "invalid" as const };
  }

  const taken = await prisma.user.findFirst({
    where: { email: newEmail, NOT: { id: userId } },
    select: { id: true }
  });
  if (taken) return { ok: false as const, reason: "taken" as const };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, emailVerified: new Date(), verified: true }
    }),
    prisma.emailOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } })
  ]);

  return { ok: true as const };
}
