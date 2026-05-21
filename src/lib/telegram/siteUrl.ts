/** Canonical public site origin for Telegram webhook (avoid apex → www 307). */
export function canonicalTelegramWebhookBase(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.hostname === "tajstay.site") {
      u.hostname = "www.tajstay.site";
    }
    return u.origin;
  } catch {
    return trimmed;
  }
}

export function telegramWebhookUrl(base: string): string {
  return `${canonicalTelegramWebhookBase(base)}/api/telegram/webhook`;
}
