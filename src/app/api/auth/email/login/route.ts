import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";

const schema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6)
}).refine((v) => Boolean(v.phone) || Boolean(v.email), { message: "phone or email required" });

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipRl = rateLimit(`post:login:ip:${ip}`, 40, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { phone, email, password } = parsed.data;
  const rawPhone = phone?.trim();
  const normalizedPhone = phone ? normalizePhone(phone) : "";
  const normalizedEmail = email?.trim().toLowerCase();
  const idKey = normalizedPhone || normalizedEmail || "unknown";
  const idRl = rateLimit(`post:login:id:${idKey}`, 20, 60_000);
  if (!idRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (idRl.retryAfterSec) res.headers.set("Retry-After", String(idRl.retryAfterSec));
    return res;
  }

  let user = normalizedPhone
    ? await prisma.user.findUnique({ where: { phone: normalizedPhone } })
    : await prisma.user.findUnique({ where: { email: normalizedEmail! } });
  if (!user && rawPhone && rawPhone !== normalizedPhone) {
    user = await prisma.user.findUnique({ where: { phone: rawPhone } });
  }

  if (!user || user.isBanned) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(password, user.password);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  if (normalizedEmail && user.email && !user.emailVerified) {
    return NextResponse.json(
      { error: "email_not_verified", email: user.email },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(user.id, res);
  return res;
}

