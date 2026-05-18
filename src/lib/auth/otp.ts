import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validation/phone";

const OTP_EXPIRES_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_CODE_RE = /^\d{6}$/;

export function generateOtpCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

export function hashOtpCode(code: string): string {
  // Deterministic hash so we never store plain OTP.
  return crypto.createHash("sha256").update(code).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function createPhoneOtp(phone: string): Promise<{ otp: string }> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("Invalid phone");
  const existing = await prisma.otpChallenge.findUnique({ where: { phone: normalizedPhone } });
  if (existing?.lockedUntil && existing.lockedUntil.getTime() > Date.now()) {
    throw new Error("OTP locked");
  }
  if (existing?.lastSentAt && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new Error("OTP cooldown");
  }
  const otp = generateOtpCode();
  const codeHash = hashOtpCode(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  await prisma.otpChallenge.upsert({
    where: { phone: normalizedPhone },
    update: { codeHash, expiresAt, usedAt: null, attempts: 0, lockedUntil: null, lastSentAt: new Date() },
    create: { phone: normalizedPhone, codeHash, expiresAt, attempts: 0, lockedUntil: null, lastSentAt: new Date() }
  });

  return { otp };
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return false;
  const normalizedCode = String(code ?? "").trim();
  // Always hash something to reduce phone enumeration/timing differences.
  const codeHash = hashOtpCode(OTP_CODE_RE.test(normalizedCode) ? normalizedCode : "000000");

  const challenge = await prisma.otpChallenge.findUnique({ where: { phone: normalizedPhone } });
  const now = Date.now();
  const isUsable =
    !!challenge &&
    !challenge.usedAt &&
    (!challenge.lockedUntil || challenge.lockedUntil.getTime() <= now) &&
    challenge.expiresAt.getTime() >= now;

  const matches = isUsable ? timingSafeEqualHex(challenge.codeHash, codeHash) : false;
  if (!matches) {
    // Small delay makes brute-forcing materially harder even without distributed rate limiting.
    await new Promise((r) => setTimeout(r, 180));
    if (challenge && !challenge.usedAt) {
      const nextAttempts = (challenge.attempts ?? 0) + 1;
      const shouldLock = nextAttempts >= OTP_MAX_ATTEMPTS;
      await prisma.otpChallenge.update({
        where: { phone: normalizedPhone },
        data: {
          attempts: nextAttempts,
          lockedUntil: shouldLock ? new Date(now + OTP_LOCK_MS) : undefined
        }
      });
    }
    return false;
  }

  await prisma.otpChallenge.update({
    where: { phone: normalizedPhone },
    data: { usedAt: new Date() }
  });
  return true;
}

