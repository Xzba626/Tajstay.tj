import { prisma } from "@/lib/prisma";
import { verifyOtpCodeHash } from "@/lib/auth/otp";

export const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";

export type VerifyEmailResetOtpResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function verifyEmailResetOtp(email: string, code: string): Promise<VerifyEmailResetOtpResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Invalid or expired code", status: 400 };

  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId: user.id,
      email,
      purpose: PASSWORD_RESET_PURPOSE,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otp) return { ok: false, error: "Invalid or expired code", status: 400 };
  if ((otp.attempts ?? 0) >= 5) return { ok: false, error: "Too many attempts", status: 429 };

  const matches = verifyOtpCodeHash(code, otp.codeHash);
  if (!matches) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: (otp.attempts ?? 0) + 1 }
    });
    return { ok: false, error: "Invalid or expired code", status: 400 };
  }

  return { ok: true };
}
