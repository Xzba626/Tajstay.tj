import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireAuth";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { startEmailChangeChallenge } from "@/lib/auth/emailChange";

const schema = z.object({
  email: z.string().trim().toLowerCase().email()
});

export async function POST(req: Request) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:email-change:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const userRl = rateLimit(`post:email-change:user:${user.id}`, 8, 10 * 60_000);
  if (!userRl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const result = await startEmailChangeChallenge({ userId: user.id, newEmail: parsed.data.email });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
}
