/** Telegram webhook secret_token: only A–Z, a–z, 0–9, _, - (1–256 chars). */
export function sanitizeTelegramWebhookSecret(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let value = raw.trim();

  if (value.startsWith("TELEGRAM_WEBHOOK_SECRET=")) {
    value = value.slice("TELEGRAM_WEBHOOK_SECRET=".length).trim();
  }
  if (value.startsWith("TELEGRAM_LOGIN_SECRET=")) {
    value = value.slice("TELEGRAM_LOGIN_SECRET=".length).trim();
  }
  if (value.includes("=")) {
    const parts = value.split("=").map((p) => p.trim()).filter(Boolean);
    value = parts[parts.length - 1] ?? value;
  }

  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, "");
  if (cleaned.length < 8 || cleaned.length > 256) return null;
  return cleaned;
}
