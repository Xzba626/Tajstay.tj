/**
 * Register Telegram webhook for TajStay bot.
 * Reads TELEGRAM_BOT_TOKEN from .env / .env.local (Windows-friendly).
 *
 * Usage:
 *   node scripts/telegram-set-webhook.mjs https://tajstay.site
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filename) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function canonicalWebhookBase(base) {
  const trimmed = base.replace(/\/$/, "");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.hostname === "tajstay.site") {
      u.hostname = "www.tajstay.site";
      console.warn("Using www.tajstay.site — apex tajstay.site returns 307 and breaks Telegram webhook.");
    }
    return u.origin;
  } catch {
    return trimmed;
  }
}

const baseArg = process.argv[2]?.replace(/\/$/, "");
const base = baseArg ? canonicalWebhookBase(baseArg) : "";
let token = process.env.TELEGRAM_BOT_TOKEN?.trim();
function sanitizeWebhookSecret(raw) {
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

let secret = sanitizeWebhookSecret(process.env.TELEGRAM_WEBHOOK_SECRET);
if (process.env.TELEGRAM_WEBHOOK_SECRET?.trim() && !secret) {
  console.warn("TELEGRAM_WEBHOOK_SECRET ignored (use only A-Z, a-z, 0-9, _, - , length 8-256).");
}

if (!base || !token) {
  console.error("Could not find TELEGRAM_BOT_TOKEN.");
  console.error("");
  console.error("Add to .env in project root:");
  console.error('  TELEGRAM_BOT_TOKEN="your-bot-token-from-BotFather"');
  console.error('  TELEGRAM_WEBHOOK_SECRET="optional-random-string"');
  console.error("");
  console.error("Then run:");
  console.error("  node scripts/telegram-set-webhook.mjs https://www.tajstay.site");
  console.error("");
  console.error("PowerShell alternative:");
  console.error(
    '  $env:TELEGRAM_BOT_TOKEN="your-token"; node scripts/telegram-set-webhook.mjs https://tajstay.site'
  );
  process.exit(1);
}

const url = `${base}/api/telegram/webhook`;
const body = { url, allowed_updates: ["message", "callback_query"] };
if (secret) body.secret_token = secret;

console.log("Setting webhook:", url);

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
process.exit(json.ok ? 0 : 1);
