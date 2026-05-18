import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { clearSessionCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6)
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { token, password } = parsed.data;
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

