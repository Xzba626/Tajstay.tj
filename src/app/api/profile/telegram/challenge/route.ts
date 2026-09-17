import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";
import {
  createTelegramAccountLinkChallenge,
  TG_LINK_COOKIE
} from "@/lib/telegram/accountLink";

export const dynamic = "force-dynamic";

/** POST /api/profile/telegram/challenge — start Telegram link/relink for authenticated user. */
export async function POST(req: Request) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`post:tg-link:ip:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const userRl = rateLimit(`post:tg-link:user:${user.id}`, 10, 10 * 60_000);
  if (!userRl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const challenge = await createTelegramAccountLinkChallenge(user.id);
  const res = NextResponse.json({
    ok: true,
    token: challenge.token,
    deepLink: challenge.deepLink,
    appDeepLink: challenge.appDeepLink,
    expiresAt: challenge.expiresAt
  });
  res.cookies.set(TG_LINK_COOKIE, challenge.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 5 * 60
  });
  return res;
}
