import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailResetOtp } from "@/lib/auth/emailResetOtp";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/)
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipRl = rateLimit(`post:verify-reset-otp:ip:${ip}`, 30, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { email, code } = parsed.data;
  const pairRl = rateLimit(`post:verify-reset-otp:pair:${ip}:${email}`, 12, 10 * 60_000);
  if (!pairRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (pairRl.retryAfterSec) res.headers.set("Retry-After", String(pairRl.retryAfterSec));
    return res;
  }

  const result = await verifyEmailResetOtp(email, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
