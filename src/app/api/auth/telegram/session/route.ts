import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** @deprecated Use POST /api/auth/telegram/verify with token + code. */
export async function POST() {
  return NextResponse.json(
    { error: "Use /api/auth/telegram/verify with the code from Telegram" },
    { status: 410 }
  );
}
