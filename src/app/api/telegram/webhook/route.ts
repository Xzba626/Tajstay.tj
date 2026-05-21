import { NextResponse } from "next/server";
import { getTelegramWebhookSecret, isTelegramLoginConfigured } from "@/lib/telegram/config";
import { sanitizeTelegramWebhookSecret } from "@/lib/telegram/webhookSecret";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/webhookHandlers";

export const dynamic = "force-dynamic";

/** POST /api/telegram/webhook — Telegram Bot API updates. */
export async function POST(req: Request) {
  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const secret = sanitizeTelegramWebhookSecret(getTelegramWebhookSecret());
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("[telegram/webhook]", err);
  }

  return NextResponse.json({ ok: true });
}
