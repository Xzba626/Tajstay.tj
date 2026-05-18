import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createPhoneOtp, verifyPhoneOtp } from "@/lib/auth/otp";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";

const requestSchema = z.object({
  phone: z.string().min(6)
});

const verifySchema = z.object({
  phone: z.string().min(6),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(2).optional()
});

/** POST /api/phone-otp/request — вне /api/auth, чтобы не перехватывался Auth.js [...nextauth]. */
export async function handlePhoneOtpRequest(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const ip = clientIp(req);
  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const ipRl = rateLimit(`post:otp-request:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const phoneRl = rateLimit(`post:otp-request:phone:${normalizedPhone}`, 5, 10 * 60_000);
  if (!phoneRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (phoneRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const pairRl = rateLimit(`post:otp-request:pair:${ip}:${normalizedPhone}`, 4, 10 * 60_000);
  if (!pairRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (pairRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  let otp: string | undefined;
  try {
    ({ otp } = await createPhoneOtp(normalizedPhone));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OTP error";
    if (msg === "OTP locked") return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (msg === "OTP cooldown") {
      return NextResponse.json({ error: "Please wait before requesting a new code." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to create OTP" }, { status: 500 });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, otp });
}

/** POST /api/phone-otp/verify */
export async function handlePhoneOtpVerify(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const ip = clientIp(req);
  const normalizedPhone = normalizePhone(parsed.data.phone);
  const normalizedCode = parsed.data.code.trim();
  const normalizedName = parsed.data.name?.trim();
  if (!normalizedPhone || !normalizedCode) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ipRl = rateLimit(`post:otp-verify:ip:${ip}`, 50, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const phoneRl = rateLimit(`post:otp-verify:phone:${normalizedPhone}`, 8, 10 * 60_000);
  if (!phoneRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (phoneRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const pairRl = rateLimit(`post:otp-verify:pair:${ip}:${normalizedPhone}`, 8, 10 * 60_000);
  if (!pairRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (pairRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const ok = await verifyPhoneOtp(normalizedPhone, normalizedCode);
  if (!ok) return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });

  const rawPhone = parsed.data.phone.trim();
  const existing =
    (await prisma.user.findUnique({ where: { phone: normalizedPhone } })) ||
    (rawPhone !== normalizedPhone ? await prisma.user.findUnique({ where: { phone: rawPhone } }) : null);
  let user = existing;
  if (!existing) {
    const passwordHash = await hashPassword(`otp-${crypto.randomBytes(8).toString("hex")}`);
    user = await prisma.user.create({
      data: {
        name: normalizedName || "Пользователь",
        phone: normalizedPhone,
        password: passwordHash,
        role: "GUEST",
        verified: true
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        verified: true,
        name: normalizedName || existing.name
      }
    });
  }

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(user.id, res);
  return res;
}
