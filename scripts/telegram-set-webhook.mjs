/**
 * Register Telegram webhook for TajStay bot.
 * Usage: node scripts/telegram-set-webhook.mjs https://your-domain.vercel.app
 */
const base = process.argv[2]?.replace(/\/$/, "");
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

if (!base || !token) {
  console.error("Usage: TELEGRAM_BOT_TOKEN=... node scripts/telegram-set-webhook.mjs https://your-domain");
  process.exit(1);
}

const url = `${base}/api/telegram/webhook`;
const body = { url, allowed_updates: ["message", "callback_query"] };
if (secret) body.secret_token = secret;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
process.exit(json.ok ? 0 : 1);
