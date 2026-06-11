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
import { readRoleFromRequest } from "@/lib/auth/sessionRole";
import { USER_ROLE } from "@/lib/auth/permissions";

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

function hasSessionCookie(req: NextRequest): boolean {
  const legacyToken = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const authjsToken = AUTHJS_COOKIES.map((k) => req.cookies.get(k)?.value).find(Boolean) ?? "";
  return (legacyToken && looksLikeLegacySessionToken(legacyToken)) || !!authjsToken;
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

function roleDeniedRedirect(req: NextRequest, notice: string): NextResponse {
  const role = readRoleFromRequest(req);
  let target = "/dashboard/bookings";
  if (role === USER_ROLE.ADMIN) target = "/dashboard/admin";
  else if (role === USER_ROLE.OWNER) target = "/dashboard/owner";
  else if (role === USER_ROLE.HOTEL_MODERATOR) target = "/dashboard/moderator";
  const url = publicUrl(req, target);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url);
}

function enforceRoleForPath(req: NextRequest, path: string): NextResponse | null {
  const role = readRoleFromRequest(req);

  if (path.startsWith("/dashboard/admin")) {
    if (role && role !== USER_ROLE.ADMIN) {
      return roleDeniedRedirect(req, "adminOnly");
    }
    return null;
  }

  if (path.startsWith("/dashboard/owner")) {
    if (role === USER_ROLE.HOTEL_MODERATOR) {
      return roleDeniedRedirect(req, "ownerOnly");
    }
    if (role && role !== USER_ROLE.OWNER && role !== USER_ROLE.ADMIN) {
      return roleDeniedRedirect(req, "ownerOnly");
    }
    return null;
  }

  if (path.startsWith("/dashboard/moderator")) {
    if (role === USER_ROLE.OWNER) {
      return roleDeniedRedirect(req, "moderatorOnly");
    }
    if (role && role !== USER_ROLE.HOTEL_MODERATOR && role !== USER_ROLE.ADMIN) {
      return roleDeniedRedirect(req, "moderatorOnly");
    }
    return null;
  }

  if (path.startsWith("/api/owner")) {
    if (role === USER_ROLE.HOTEL_MODERATOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role && role !== USER_ROLE.OWNER && role !== USER_ROLE.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  }

  if (path.startsWith("/api/moderator")) {
    if (role === USER_ROLE.OWNER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role && role !== USER_ROLE.HOTEL_MODERATOR && role !== USER_ROLE.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isTelegramWebhookPath(path)) {
    return NextResponse.next();
  }

  const protectedDashboard =
    path.startsWith("/dashboard/admin") ||
    path.startsWith("/dashboard/owner") ||
    path.startsWith("/dashboard/owner-requests") ||
    path.startsWith("/dashboard/moderator");

  const protectedApi = path.startsWith("/api/owner") || path.startsWith("/api/moderator");

  if (protectedDashboard || protectedApi) {
    if (!hasSessionCookie(req)) {
      if (protectedApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const signIn = publicUrl(req, "/auth/sign-in");
      signIn.searchParams.set("next", `${path}${req.nextUrl.search}`);
      return NextResponse.redirect(signIn);
    }

    const roleBlock = enforceRoleForPath(req, path);
    if (roleBlock) return roleBlock;

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
    "/api/owner/:path*",
    "/api/moderator/:path*",
    "/dashboard/admin/:path*",
    "/dashboard/owner/:path*",
    "/dashboard/owner-requests/:path*",
    "/dashboard/moderator/:path*",
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)"
  ]
};
