import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicUrl } from "@/lib/http/publicOrigin";
import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/detectLocale";
import {
  LOCALE_AUTO_COOKIE,
  LOCALE_COOKIE,
  LOCALE_MANUAL_COOKIE,
  normalizeLocale
} from "@/lib/i18n/locale";

const SESSION_COOKIE = "tajstay_session";
const TELEGRAM_WEBHOOK_PATH = "/api/telegram/webhook";
const AUTHJS_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token"
] as const;

const ONE_YEAR = 60 * 60 * 24 * 400;

function looksLikeLegacySessionToken(v: string): boolean {
  return /^[a-f0-9]{64}$/i.test(v);
}

function isTelegramWebhookPath(path: string): boolean {
  return path === TELEGRAM_WEBHOOK_PATH || path.startsWith(`${TELEGRAM_WEBHOOK_PATH}/`);
}

function applyLocaleCookies(req: NextRequest, res: NextResponse) {
  const manual = req.cookies.get(LOCALE_MANUAL_COOKIE)?.value === "1";
  const existing = req.cookies.get(LOCALE_COOKIE)?.value;
  if (manual && existing) return;

  const detected = detectLocaleFromAcceptLanguage(req.headers.get("accept-language"));
  const locale = existing ? normalizeLocale(existing) : detected;

  if (!existing) {
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
    res.cookies.set(LOCALE_AUTO_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isTelegramWebhookPath(path)) {
    return NextResponse.next();
  }

  if (path.startsWith("/dashboard/admin") || path.startsWith("/dashboard/owner")) {
    const legacyToken = req.cookies.get(SESSION_COOKIE)?.value ?? "";
    const authjsToken = AUTHJS_COOKIES.map((k) => req.cookies.get(k)?.value).find(Boolean) ?? "";
    const hasSession = (legacyToken && looksLikeLegacySessionToken(legacyToken)) || !!authjsToken;
    if (!hasSession) {
      const signIn = publicUrl(req, "/auth/sign-in");
      signIn.searchParams.set("next", `${path}${req.nextUrl.search}`);
      return NextResponse.redirect(signIn);
    }
    const res = NextResponse.next();
    applyLocaleCookies(req, res);
    return res;
  }

  const res = NextResponse.next();
  applyLocaleCookies(req, res);
  return res;
}

export const config = {
  matcher: [
    "/api/telegram/webhook",
    "/api/telegram/webhook/:path*",
    "/dashboard/admin/:path*",
    "/dashboard/owner/:path*",
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)"
  ]
};
