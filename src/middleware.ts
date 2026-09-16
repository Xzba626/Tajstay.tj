import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicUrl } from "@/lib/http/publicOrigin";
import { shellFor } from "@/lib/shell/classify";

// Re-exported for backward compatibility (scripts/test-block61a-admin-shell.ts imports this from
// here) — the real implementation now lives in src/lib/shell/classify.ts so ShellBoundaryGuard.tsx
// (a client component) can share it without pulling in next/server.
export { shellFor };

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

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tajstay-shell", shellFor(path));
  const withShellHeader = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (!path.startsWith("/dashboard/admin") && !path.startsWith("/dashboard/owner") && !path.startsWith("/dashboard/manager")) {
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
