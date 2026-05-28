import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyEmailResetOtp, PASSWORD_RESET_PURPOSE } from "@/lib/auth/emailResetOtp";
import { hashPassword } from "@/lib/auth/password";
import { clearSessionCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const tokenSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6)
});

const otpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(8),
  confirmPassword: z.string().min(8)
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipRl = rateLimit(`post:reset-password:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsedOtp = otpSchema.safeParse(body);
  if (parsedOtp.success) {
    const { email, code, password, confirmPassword } = parsedOtp.data;
    if (password !== confirmPassword) return NextResponse.json({ error: "Password mismatch" }, { status: 400 });

    const pairRl = rateLimit(`post:reset-password:pair:${ip}:${email}`, 12, 10 * 60_000);
    if (!pairRl.ok) {
      const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
      if (pairRl.retryAfterSec) res.headers.set("Retry-After", String(pairRl.retryAfterSec));
      return res;
    }

    const verified = await verifyEmailResetOtp(email, code);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

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
    if (!otp) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.emailOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } })
    ]);

    const res = NextResponse.json({ success: true });
    clearSessionCookie(res);
    return res;
  }

  const parsedToken = tokenSchema.safeParse(body);
  if (!parsedToken.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { token, password } = parsedToken.data;
  const tokenRl = rateLimit(`post:reset-password:token:${token.slice(0, 16)}`, 5, 10 * 60_000);
  if (!tokenRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (tokenRl.retryAfterSec) res.headers.set("Retry-After", String(tokenRl.retryAfterSec));
    return res;
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const rec = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash }
  });
  if (!rec || rec.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { password: passwordHash } }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
    prisma.passwordResetToken.delete({ where: { token: tokenHash } })
  ]);

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

