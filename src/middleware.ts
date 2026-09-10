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
/**
 * Shell classification for RootLayout — Admin/Owner render their own CRM shell,
 * everything else renders the Public/Consumer shell (Header/Footer/MobileBottomNav/
 * AppShell). Read via `headers().get("x-tajstay-shell")` in `src/app/layout.tsx`.
 * Not CSS-hide: this decides what RootLayout renders server-side, nothing is mounted
 * then hidden.
 */
function shellFor(path: string): "admin" | "owner" | "consumer" {
  if (path.startsWith("/dashboard/admin")) return "admin";
  if (path.startsWith("/dashboard/owner")) return "owner";
  return "consumer";
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Telegram Bot API: must never redirect (307 breaks webhook delivery).
  if (isTelegramWebhookPath(path)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tajstay-shell", shellFor(path));
  const withShellHeader = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (!path.startsWith("/dashboard/admin") && !path.startsWith("/dashboard/owner")) {
    return withShellHeader();
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

  return withShellHeader();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|apple-touch-icon.png|manifest.webmanifest|icons/|sw.js).*)"
  ]
};
