import { NextResponse } from "next/server";
import { createTelegramLoginChallenge } from "@/lib/telegram/loginChallenge";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

/** POST /api/auth/telegram/challenge — start Telegram login (5 min). */
export async function POST(req: Request) {
  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ error: "Telegram login unavailable", reason: "not_configured" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`post:telegram-challenge:ip:${ip}`, 20, 60_000);
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (rl.retryAfterSec) res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  const challenge = await createTelegramLoginChallenge();
  return NextResponse.json(challenge);
}
