import { NextResponse } from "next/server";
import { getTelegramChallengeStatus } from "@/lib/telegram/loginChallenge";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

/** GET /api/auth/telegram/status/[token] — poll login challenge. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ error: "Telegram login is not configured" }, { status: 503 });
  }

  const token = (params.token || "").trim();
  if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const status = await getTelegramChallengeStatus(token);
  return NextResponse.json(status);
}
