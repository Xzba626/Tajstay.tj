import { NextRequest, NextResponse } from "next/server";
import { runChatArchiveJob } from "@/lib/chat/bookingChat";

/**
 * Периодический перенос чатов в архив (30 дней после выезда, терминальные статусы).
 * Вызов: GET /api/cron/archive-booking-chats
 * Заголовок: Authorization: Bearer <CRON_SECRET> (если CRON_SECRET задан в .env).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const result = await runChatArchiveJob();
  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}
