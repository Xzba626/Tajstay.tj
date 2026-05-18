import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { verifyPhoneOtp } from "@/lib/auth/otp";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  password: z.string().min(6),
  otp: z.string().regex(/^\d{6}$/),
  role: z.enum(["GUEST", "OWNER"]).optional()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { name, phone, email, password } = parsed.data;
  const rawPhone = phone.trim();
  const ip = clientIp(req);
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email?.trim().toLowerCase() || null;
  const normalizedName = name.trim();

  if (!normalizedPhone || normalizedName.length < 2) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ipRl = rateLimit(`post:register:ip:${ip}`, 15, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const phoneRl = rateLimit(`post:register:phone:${normalizedPhone}`, 5, 10 * 60_000);
  if (!phoneRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (phoneRl.retryAfterSec) res.headers.set("Retry-After", String(phoneRl.retryAfterSec));
    return res;
  }

  const existingByPhone = await prisma.user.findFirst({
    where: {
      OR: [{ phone: normalizedPhone }, { phone: rawPhone }]
    }
  });
  if (existingByPhone) return NextResponse.json({ error: "Phone already in use" }, { status: 409 });

  if (normalizedEmail) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const otpOk = await verifyPhoneOtp(normalizedPhone, parsed.data.otp);
  if (!otpOk) return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });

  const passwordHash = await hashPassword(password);

  const role = parsed.data.role === "OWNER" ? "OWNER" : "GUEST";

  const user = await prisma.user.create({
    data: {
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      password: passwordHash,
      role,
      verified: true
    }
  });

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(user.id, res);
  return res;
}

