import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { createSessionCookie } from "@/lib/auth/session";
import { createUserFromFirebasePhone, findUserByFirebaseOrPhone, verifyFirebaseIdToken } from "@/lib/auth/firebasePhone";
import { isFirebasePhoneAuthConfigured } from "@/lib/firebase/config";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";
import { verifyPhoneOtp } from "@/lib/auth/otp";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    firebaseIdToken: z.string().min(20).optional(),
    otp: z.string().regex(/^\d{6}$/).optional()
  })
  .refine((v) => Boolean(v.firebaseIdToken) || Boolean(v.otp), {
    message: "firebaseIdToken or otp required"
  });

/** POST /api/auth/firebase/register — регистрация по телефону (Firebase SMS или dev OTP). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const normalizedName = parsed.data.name.trim();
  const normalizedEmail = parsed.data.email?.trim().toLowerCase() || null;

  if (!normalizedPhone || normalizedName.length < 2) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:firebase-register:ip:${ip}`, 15, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const existing = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
  if (existing) return NextResponse.json({ error: "Phone already in use" }, { status: 409 });

  if (normalizedEmail) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  let user;

  if (parsed.data.firebaseIdToken) {
    if (!isFirebasePhoneAuthConfigured()) {
      return NextResponse.json({ error: "Firebase phone auth is not configured" }, { status: 503 });
    }
    try {
      const { firebaseUid, phone: tokenPhone } = await verifyFirebaseIdToken(parsed.data.firebaseIdToken);
      if (tokenPhone !== normalizedPhone) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
      const clash = await findUserByFirebaseOrPhone(firebaseUid, normalizedPhone);
      if (clash) return NextResponse.json({ error: "Phone already in use" }, { status: 409 });

      user = await createUserFromFirebasePhone({
        firebaseUid,
        phone: normalizedPhone,
        name: normalizedName,
        email: normalizedEmail
      });
    } catch {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }
  } else {
    const otpOk = await verifyPhoneOtp(normalizedPhone, parsed.data.otp!);
    if (!otpOk) return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });

    user = await prisma.user.create({
      data: {
        name: normalizedName,
        phone: normalizedPhone,
        email: normalizedEmail,
        password: await hashPassword(`otp-${crypto.randomBytes(8).toString("hex")}`),
        role: "GUEST",
        phoneVerified: true,
        verified: true
      }
    });
  }

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(user.id, res);
  return res;
}
