import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { generateOtpCode, hashOtpCode } from "@/lib/auth/otp";
import { sendPasswordResetOtpEmail } from "@/lib/email/sendPasswordResetOtp";

const schema = z.object({
  email: z.string().trim().toLowerCase().email()
});

const PURPOSE = "PASSWORD_RESET";
const OTP_EXPIRES_MS = 10 * 60 * 1000;

function rateLimitedResponse(retryAfterSec?: number) {
  const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
  if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipRl = rateLimit(`post:forgot-password:ip:${ip}`, 30, 60_000);
  if (!ipRl.ok) {
    return rateLimitedResponse(ipRl.retryAfterSec);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  // Never reveal whether email exists.
  if (!parsed.success) {
    return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
  }

  const email = parsed.data.email;

  const emailRl = rateLimit(`post:forgot-password:email:${email}`, 6, 10 * 60_000);
  if (!emailRl.ok) {
    return rateLimitedResponse(emailRl.retryAfterSec);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
  }

  const last = await prisma.emailOtp.findFirst({
    where: { userId: user.id, purpose: PURPOSE, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (last && Date.now() - last.createdAt.getTime() < 60_000) {
    return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
  }

  // Invalidate previous active OTPs for this purpose.
  await prisma.emailOtp.updateMany({
    where: { userId: user.id, purpose: PURPOSE, usedAt: null },
    data: { usedAt: new Date() }
  });

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);
  const otp = await prisma.emailOtp.create({
    data: {
      userId: user.id,
      email,
      codeHash,
      purpose: PURPOSE,
      expiresAt,
      attempts: 0
    }
  });

  const sendResult = await sendPasswordResetOtpEmail({ to: email, code });
  if (!sendResult.ok) {
    // Remove undelivered OTP; usedAt is reserved for successfully verified codes.
    await prisma.emailOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
  }

  return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
}

