/**
 * Authenticated Telegram account link / relink (MASTER FINAL).
 * Reuses TelegramLoginChallenge rows + deep link, but purpose = account bind
 * (no phone OTP). Web deep-link: start=link_<token>
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTelegramBotUsername } from "@/lib/telegram/config";
import { hashTelegramLoginCode } from "@/lib/telegram/loginChallenge";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";

const LINK_TTL_MS = 5 * 60 * 1000;
const TOKEN_BYTES = 18;
export const TG_LINK_COOKIE = "tajstay_tg_link";

function linkSecret(): string {
  const configured = process.env.TELEGRAM_LOGIN_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "tajstay-telegram-dev";
  throw new Error("Security misconfiguration: TELEGRAM_LOGIN_SECRET/AUTH_SECRET missing in production.");
}

export function buildTelegramLinkDeepLink(token: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `https://t.me/${bot}?start=link_${token}`;
}

export function buildTelegramLinkAppDeepLink(token: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `tg://resolve?domain=${bot}&start=link_${token}`;
}

export function parseLinkStartPayload(text: string | undefined): string | null {
  if (!text) return null;
  const parts = text.trim().split(/\s+/);
  const payload = parts[1] || (parts[0]?.startsWith("link_") ? parts[0] : null);
  if (!payload?.startsWith("link_")) return null;
  const token = payload.slice("link_".length).trim();
  return token.length >= 8 ? token : null;
}

export function signLinkCookie(userId: number, token: string, expiresAtMs: number): string {
  const body = `${userId}.${token}.${expiresAtMs}`;
  const sig = crypto.createHmac("sha256", linkSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLinkCookie(
  raw: string | undefined,
  expectedUserId: number
): { ok: true; token: string } | { ok: false } {
  if (!raw) return { ok: false };
  const parts = raw.split(".");
  if (parts.length !== 4) return { ok: false };
  const [userIdStr, token, expStr, sig] = parts;
  const userId = Number(userIdStr);
  const expiresAtMs = Number(expStr);
  if (!Number.isFinite(userId) || userId !== expectedUserId || !token || !Number.isFinite(expiresAtMs)) {
    return { ok: false };
  }
  if (expiresAtMs < Date.now()) return { ok: false };
  const body = `${userId}.${token}.${expiresAtMs}`;
  const expected = crypto.createHmac("sha256", linkSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false };
  return { ok: true, token };
}

export async function createTelegramAccountLinkChallenge(userId: number): Promise<{
  token: string;
  deepLink: string;
  appDeepLink: string;
  expiresAt: string;
  cookieValue: string;
}> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const codeHash = hashTelegramLoginCode(token, "link_pending");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);

  await prisma.telegramLoginChallenge.create({
    data: { token, codeHash, expiresAt }
  });

  const cookieValue = signLinkCookie(userId, token, expiresAt.getTime());
  return {
    token,
    deepLink: buildTelegramLinkDeepLink(token),
    appDeepLink: buildTelegramLinkAppDeepLink(token),
    expiresAt: expiresAt.toISOString(),
    cookieValue
  };
}

export type TelegramLinkStatus =
  | "pending"
  | "ready"
  | "completed"
  | "expired"
  | "used"
  | "not_found"
  | "conflict";

export async function getTelegramLinkStatus(token: string): Promise<{
  status: TelegramLinkStatus;
  telegramUsername?: string | null;
}> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge) return { status: "not_found" };
  if (challenge.usedAt) return { status: "used", telegramUsername: challenge.telegramUsername };
  if (challenge.expiresAt.getTime() < Date.now()) return { status: "expired" };
  if (challenge.telegramId) {
    return { status: "ready", telegramUsername: challenge.telegramUsername };
  }
  return { status: "pending" };
}

/**
 * After /start link_<token>: bind Telegram identity on the challenge (no phone).
 */
export async function attachTelegramOnLinkStart(
  token: string,
  telegram: {
    id: number;
    username?: string | null;
    first_name?: string | null;
    photoUrl?: string | null;
    language_code?: string | null;
  }
): Promise<boolean> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || challenge.usedAt || challenge.expiresAt.getTime() < Date.now()) return false;

  // Only accept challenges created for account-link (not login OTP flows).
  const linkPending = hashTelegramLoginCode(token, "link_pending");
  const linkReady = hashTelegramLoginCode(token, "link_ready");
  if (challenge.codeHash !== linkPending && challenge.codeHash !== linkReady) return false;

  const telegramId = String(telegram.id);
  if (challenge.telegramId && challenge.telegramId !== telegramId) return false;

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      telegramId,
      telegramUsername: telegram.username?.trim() || null,
      telegramFirstName: telegram.first_name?.trim() || null,
      telegramPhotoUrl: telegram.photoUrl ?? undefined,
      codeHash: linkReady
    }
  });

  const locale = botLocaleFromTelegram(telegram.language_code);
  const L = telegramBotMessages(locale);
  await sendTelegramMessage({
    chatId: Number(telegramId),
    text: L.linkReturnToSite,
    removeKeyboard: true
  });
  return true;
}

export async function completeTelegramAccountLink(input: {
  userId: number;
  token: string;
}): Promise<{ ok: true; telegramId: string } | { ok: false; error: string; status: number }> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token: input.token } });
  if (!challenge) return { ok: false, error: "not_found", status: 404 };
  if (challenge.usedAt) return { ok: false, error: "used", status: 409 };
  if (challenge.expiresAt.getTime() < Date.now()) return { ok: false, error: "expired", status: 400 };
  if (!challenge.telegramId) return { ok: false, error: "pending", status: 409 };

  const telegramId = challenge.telegramId;
  const taken = await prisma.user.findFirst({
    where: { telegramId, NOT: { id: input.userId } },
    select: { id: true }
  });
  if (taken) return { ok: false, error: "telegram_taken", status: 409 };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: {
        telegramId,
        telegramUsername: challenge.telegramUsername,
        telegramPhotoUrl: challenge.telegramPhotoUrl ?? undefined
      }
    }),
    prisma.telegramLoginChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date(), verifiedAt: new Date() }
    })
  ]);

  return { ok: true, telegramId };
}
