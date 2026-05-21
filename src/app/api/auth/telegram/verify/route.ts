import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie } from "@/lib/auth/session";
import { verifyTelegramLoginCode, notifyTelegramLoginSuccess } from "@/lib/telegram/loginChallenge";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";
import { logAuthEvent } from "@/lib/auth/auditLog";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { notifyAuthLogin } from "@/lib/auth/authNotifications";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(8),
  code: z.string().regex(/^\d{6}$/)
});

/** POST /api/auth/telegram/verify — verify code entered on site, create session. */
export async function POST(req: Request) {
  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ error: "Telegram login is not configured" }, { status: 503 });
  }

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:telegram-verify:ip:${ip}`, 30, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const tokenRl = rateLimit(`post:telegram-verify:token:${parsed.data.token}`, 10, 60_000);
  if (!tokenRl.ok) {
    return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
  }

  const locale = getLocale();
  const result = await verifyTelegramLoginCode(parsed.data.token, parsed.data.code);

  if (!result.ok) {
    const msg =
      result.reason === "too_many_attempts"
        ? m(locale, "auth.telegramTooManyAttempts")
        : result.reason === "expired"
          ? m(locale, "auth.telegramExpired")
          : result.reason === "no_code"
            ? m(locale, "auth.telegramNoCodeYet")
            : m(locale, "auth.errInvalidOtp");
    const status = result.reason === "too_many_attempts" ? 429 : 401;
    return NextResponse.json({ error: msg, reason: result.reason }, { status });
  }

  await logAuthEvent({
    event: "login_telegram",
    userId: result.userId,
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    meta: { telegramId: result.telegramId, isNew: result.isNew }
  });

  void notifyAuthLogin({ userId: result.userId, ip, isNewAccount: result.isNew });
  void notifyTelegramLoginSuccess(result.telegramId).catch(() => undefined);

  const res = NextResponse.json({ ok: true });
  await createSessionCookie(result.userId, res);
  return res;
}
