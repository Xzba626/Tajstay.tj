import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import {
  completeTelegramAccountLink,
  getTelegramLinkStatus,
  TG_LINK_COOKIE,
  verifyLinkCookie
} from "@/lib/telegram/accountLink";

export const dynamic = "force-dynamic";

/** GET /api/profile/telegram/status — poll link challenge; completes when Telegram /start done. */
export async function GET(req: Request) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TG_LINK_COOKIE}=([^;]+)`));
  const raw = match ? decodeURIComponent(match[1]) : undefined;
  const verified = verifyLinkCookie(raw, user.id);
  if (!verified.ok) {
    return NextResponse.json({ status: "not_found" });
  }

  const status = await getTelegramLinkStatus(verified.token);
  if (status.status !== "ready") {
    return NextResponse.json(status);
  }

  const done = await completeTelegramAccountLink({ userId: user.id, token: verified.token });
  if (!done.ok) {
    return NextResponse.json(
      { status: done.error === "telegram_taken" ? "conflict" : done.error, error: done.error },
      { status: done.status }
    );
  }

  const res = NextResponse.json({
    status: "completed",
    telegramUsername: status.telegramUsername
  });
  res.cookies.set(TG_LINK_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
