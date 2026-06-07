import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/auth/emailVerification";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const schema = z.object({
  email: z.string().email()
});

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/** POST /api/auth/resend-verification — повторная отправка письма подтверждения email. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipRl = rateLimit(`post:resend-verify:ip:${ip}`, 10, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const emailRl = rateLimit(`post:resend-verify:email:${normalizedEmail}`, 1, RESEND_COOLDOWN_MS);
  if (!emailRl.ok) {
    const res = NextResponse.json({ error: "Wait before requesting another email." }, { status: 429 });
    if (emailRl.retryAfterSec) res.headers.set("Retry-After", String(emailRl.retryAfterSec));
    return res;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true, message: "If the account exists, a verification email was sent." });
  }

  const mail = await issueEmailVerification(user.id, normalizedEmail);
  if (!mail.ok) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, emailSkipped: mail.skipped === true });
}
