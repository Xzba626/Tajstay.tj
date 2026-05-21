import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicUrl } from "@/lib/http/publicOrigin";

const SESSION_COOKIE = "tajstay_session";
const TELEGRAM_WEBHOOK_PATH = "/api/telegram/webhook";
const AUTHJS_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token"
] as const;

function looksLikeLegacySessionToken(v: string): boolean {
  // `generateSessionToken()` is 32 random bytes hex => 64 hex chars.
  return /^[a-f0-9]{64}$/i.test(v);
}

function isTelegramWebhookPath(path: string): boolean {
  return path === TELEGRAM_WEBHOOK_PATH || path.startsWith(`${TELEGRAM_WEBHOOK_PATH}/`);
}

/**
 * Первый слой: без cookie сессии не пускаем на dashboard admin/owner.
 * Финальная проверка роли остаётся в RSC (requireAdmin / requireOwner).
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Telegram Bot API: must never redirect (307 breaks webhook delivery).
  if (isTelegramWebhookPath(path)) {
    return NextResponse.next();
  }

  if (!path.startsWith("/dashboard/admin") && !path.startsWith("/dashboard/owner")) {
    return NextResponse.next();
  }

  const legacyToken = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const authjsToken = AUTHJS_COOKIES.map((k) => req.cookies.get(k)?.value).find(Boolean) ?? "";

  const hasSession = (legacyToken && looksLikeLegacySessionToken(legacyToken)) || !!authjsToken;
  if (!hasSession) {
    const signIn = publicUrl(req, "/auth/sign-in");
    const returnTo = `${path}${req.nextUrl.search}`;
    signIn.searchParams.set("next", returnTo);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/telegram/webhook",
    "/api/telegram/webhook/:path*",
    "/dashboard/admin/:path*",
    "/dashboard/owner/:path*"
  ]
};
