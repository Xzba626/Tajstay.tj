import { NextResponse } from "next/server";
import { getTelegramWebhookSecret, isTelegramLoginConfigured } from "@/lib/telegram/config";
import { sanitizeTelegramWebhookSecret } from "@/lib/telegram/webhookSecret";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/webhookHandlers";
import { telegramWebhookUrl } from "@/lib/telegram/siteUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — health check for Telegram / monitoring (always 200, no redirect). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    webhook: telegramWebhookUrl("https://www.tajstay.site"),
    hint: "Use www.tajstay.site — apex tajstay.site returns 307 redirect"
  });
}

/** POST /api/telegram/webhook — Telegram Bot API updates. */
export async function POST(req: Request) {
  if (!isTelegramLoginConfigured()) {
    console.log("[telegram/webhook] bot not configured, ack");
    return NextResponse.json({ ok: true });
  }

  const secret = sanitizeTelegramWebhookSecret(getTelegramWebhookSecret());
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      console.warn("[telegram/webhook] forbidden: bad secret token");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("[telegram/webhook] handler error", err);
  }

  return NextResponse.json({ ok: true });
}
