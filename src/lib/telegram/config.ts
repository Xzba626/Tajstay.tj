export function getTelegramBotToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

export function getTelegramBotUsername(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "TajstayBot";
}

/** Server can create challenges and verify codes. */
export function isTelegramLoginConfigured(): boolean {
  return Boolean(getTelegramBotToken());
}

/** Show Telegram button on /auth/sign-in (needs public bot name and/or server token). */
export function isTelegramLoginUiEnabled(): boolean {
  return Boolean(getTelegramBotToken() || getTelegramBotUsernamePublic());
}

/** Public bot handle for deep links (NEXT_PUBLIC_* on Vercel). */
export function getTelegramBotUsernamePublic(): string | null {
  const u = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  return u || null;
}

export function getTelegramWebhookSecret(): string | null {
  const s = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return s || null;
}
