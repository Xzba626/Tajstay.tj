import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie } from "@/lib/auth/session";
import { resolveTelegramLoginUser } from "@/lib/telegram/loginChallenge";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";
import { logAuthEvent } from "@/lib/auth/auditLog";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { notifyAuthLogin } from "@/lib/auth/authNotifications";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(8)
});

/** POST /api/auth/telegram/session — complete login after challenge confirmed. */
export async function POST(req: Request) {
  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ error: "Telegram login is not configured" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`post:telegram-session:ip:${ip}`, 30, 60_000);
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (rl.retryAfterSec) res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const resolved = await resolveTelegramLoginUser(parsed.data.token);
  if (!resolved) {
    return NextResponse.json({ error: "Challenge not confirmed or expired" }, { status: 401 });
  }

  await logAuthEvent({
    event: "login_telegram",
    userId: resolved.userId,
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    meta: { telegramId: resolved.telegramId }
  });

  void notifyAuthLogin({ userId: resolved.userId, ip, isNewAccount: false });

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(resolved.userId, res);
  return res;
}
