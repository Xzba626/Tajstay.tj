import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { buildUniquePlaceholderPhone } from "@/lib/auth/accountPhone";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

/** POST /api/auth/email/register-email — регистрация по email + пароль (роль GUEST). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  const ip = clientIp(req);

  const ipRl = rateLimit(`post:register-email:ip:${ip}`, 15, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingByEmail) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const placeholderPhone = await buildUniquePlaceholderPhone("email");
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: normalizedName,
      phone: placeholderPhone,
      email: normalizedEmail,
      password: passwordHash,
      role: "GUEST",
      verified: true
    }
  });

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(user.id, res);
  return res;
}
