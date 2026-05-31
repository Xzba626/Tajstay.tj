import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getTelegramBotUsername } from "@/lib/telegram/config";
import { normalizePhone } from "@/lib/validation/phone";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_BYTES = 18;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

function challengeSecret(): string {
  return process.env.TELEGRAM_LOGIN_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || "tajstay-telegram-dev";
}

export function hashTelegramLoginCode(token: string, code: string): string {
  return crypto.createHmac("sha256", challengeSecret()).update(`${token}:${code}`).digest("hex");
}

function generateLoginCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function buildTelegramDeepLink(token: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `https://t.me/${bot}?start=login_${token}`;
}

export function buildTelegramAppDeepLink(token: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `tg://resolve?domain=${bot}&start=login_${token}`;
}

/** Client-side fallback when API omits appDeepLink. */
export function linksFromTelegramDeepLink(deepLink: string): { webLink: string; appLink: string } {
  try {
    const url = new URL(deepLink);
    const bot = url.pathname.replace(/^\//, "");
    const start = url.searchParams.get("start") ?? "";
    return {
      webLink: deepLink,
      appLink: `tg://resolve?domain=${bot}&start=${encodeURIComponent(start)}`
    };
  } catch {
    return { webLink: deepLink, appLink: deepLink };
  }
}

export type TelegramChallengePublicStatus =
  | "pending"
  | "awaiting_phone"
  | "code_sent"
  | "expired"
  | "used"
  | "not_found";

export async function createTelegramLoginChallenge(linkUserId?: number): Promise<{
  token: string;
  deepLink: string;
  appDeepLink: string;
  expiresAt: string;
  expiresInSec: number;
}> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const codeHash = hashTelegramLoginCode(token, "pending");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await prisma.telegramLoginChallenge.create({
    data: { token, codeHash, expiresAt, linkUserId: linkUserId ?? null }
  });

  return {
    token,
    deepLink: buildTelegramDeepLink(token),
    appDeepLink: buildTelegramAppDeepLink(token),
    expiresAt: expiresAt.toISOString(),
    expiresInSec: Math.floor(CHALLENGE_TTL_MS / 1000)
  };
}

// TODO(PMS-telegram): if user.telegramId is already linked, skip Start and push OTP directly in Telegram.

function isExpired(challenge: { expiresAt: Date; usedAt: Date | null }): boolean {
  return challenge.expiresAt.getTime() < Date.now() || Boolean(challenge.usedAt);
}

export async function getTelegramChallengeStatus(token: string): Promise<{
  status: TelegramChallengePublicStatus;
  telegramUsername?: string | null;
  phoneMasked?: string | null;
  expiresAt?: string;
  attemptsLeft?: number;
}> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge) return { status: "not_found" };
  if (challenge.usedAt) return { status: "used", telegramUsername: challenge.telegramUsername };
  if (isExpired(challenge)) return { status: "expired" };

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - challenge.attemptCount);

  if (challenge.phone && challenge.codeHash !== hashTelegramLoginCode(token, "pending")) {
    return {
      status: "code_sent",
      telegramUsername: challenge.telegramUsername,
      phoneMasked: maskPhone(challenge.phone),
      expiresAt: challenge.expiresAt.toISOString(),
      attemptsLeft
    };
  }
  if (challenge.telegramId) {
    return {
      status: "awaiting_phone",
      telegramUsername: challenge.telegramUsername,
      expiresAt: challenge.expiresAt.toISOString()
    };
  }
  return { status: "pending", expiresAt: challenge.expiresAt.toISOString() };
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `+${digits.slice(0, 3)} *** ** ${digits.slice(-2)}`;
}

/** After /start login_<token> — bind Telegram user, ask for contact. */
export async function attachTelegramOnStart(
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
  if (!challenge || isExpired(challenge)) return false;

  const telegramId = String(telegram.id);
  if (challenge.telegramId && challenge.telegramId !== telegramId) return false;

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      telegramId,
      telegramUsername: telegram.username?.trim() || null,
      telegramFirstName: telegram.first_name?.trim() || null,
      telegramPhotoUrl: telegram.photoUrl ?? undefined
    }
  });
  return true;
}

/** User shared contact — save phone, send OTP message in Telegram (not SMS). */
export async function attachPhoneAndSendCode(
  token: string,
  telegramId: string,
  rawPhone: string,
  languageCode?: string | null
): Promise<{ ok: true } | { ok: false; reason: "expired" | "invalid" | "cooldown" }> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || isExpired(challenge)) return { ok: false, reason: "expired" };
  if (!challenge.telegramId || challenge.telegramId !== telegramId) return { ok: false, reason: "invalid" };

  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalid" };

  if (challenge.lastCodeSentAt) {
    const elapsed = Date.now() - challenge.lastCodeSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) return { ok: false, reason: "cooldown" };
  }

  const code = generateLoginCode();
  const codeHash = hashTelegramLoginCode(token, code);
  const now = new Date();

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      phone,
      codeHash,
      lastCodeSentAt: now,
      attemptCount: 0
    }
  });

  const locale = botLocaleFromTelegram(languageCode);
  const L = telegramBotMessages(locale);
  await sendTelegramMessage({
    chatId: Number(telegramId),
    text: L.codeSent(code),
    removeKeyboard: true
  });

  return { ok: true };
}

export type VerifyTelegramCodeResult =
  | { ok: true; userId: number; telegramId: string; isNew: boolean }
  | { ok: false; reason: "not_found" | "expired" | "invalid" | "too_many_attempts" | "no_code" };

/** User enters code on the website. */
export async function verifyTelegramLoginCode(
  token: string,
  code: string
): Promise<VerifyTelegramCodeResult> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge) return { ok: false, reason: "not_found" };
  if (challenge.usedAt) return { ok: false, reason: "invalid" };
  if (isExpired(challenge)) return { ok: false, reason: "expired" };
  if (!challenge.telegramId || !challenge.phone) return { ok: false, reason: "no_code" };
  if (challenge.codeHash === hashTelegramLoginCode(token, "pending")) {
    return { ok: false, reason: "no_code" };
  }

  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const normalized = code.replace(/\D/g, "").trim();
  if (normalized.length !== 6) {
    await prisma.telegramLoginChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } }
    });
    return { ok: false, reason: "invalid" };
  }

  const expected = hashTelegramLoginCode(token, normalized);
  if (expected !== challenge.codeHash) {
    await prisma.telegramLoginChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } }
    });
    return { ok: false, reason: "invalid" };
  }

  const resolved = challenge.linkUserId
    ? await linkChallengeToUser(challenge, challenge.linkUserId)
    : await resolveUserFromChallenge(challenge);
  if (!resolved) return { ok: false, reason: "invalid" };

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: { verifiedAt: new Date(), usedAt: new Date() }
  });

  return { ok: true, ...resolved };
}

async function linkChallengeToUser(
  challenge: {
    id: number;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramFirstName: string | null;
    telegramPhotoUrl: string | null;
    phone: string | null;
  },
  userId: number
): Promise<{ userId: number; telegramId: string; isNew: boolean } | null> {
  if (!challenge.telegramId) return null;

  const existingTg = await prisma.user.findUnique({ where: { telegramId: challenge.telegramId } });
  if (existingTg && existingTg.id !== userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const displayName =
    challenge.telegramFirstName?.trim() ||
    (challenge.telegramUsername ? `@${challenge.telegramUsername.replace(/^@/, "")}` : null);

  const data: {
    telegramId: string;
    telegramUsername: string | null;
    telegramPhotoUrl: string | null;
    image?: string | null;
    phone?: string;
    phoneVerified?: boolean;
    verified?: boolean;
    name?: string;
  } = {
    telegramId: challenge.telegramId,
    telegramUsername: challenge.telegramUsername,
    telegramPhotoUrl: challenge.telegramPhotoUrl,
    image: challenge.telegramPhotoUrl ?? user.image
  };

  if (challenge.phone) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone: challenge.phone } });
    if (!phoneOwner || phoneOwner.id === userId) {
      data.phone = challenge.phone;
      data.phoneVerified = true;
      data.verified = true;
    }
  }

  if (!user.name?.trim() && displayName) {
    data.name = displayName;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return { userId: updated.id, telegramId: challenge.telegramId, isNew: false };
}

async function resolveUserFromChallenge(
  challenge: {
    id: number;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramFirstName: string | null;
    telegramPhotoUrl: string | null;
    phone: string | null;
  }
): Promise<{ userId: number; telegramId: string; isNew: boolean } | null> {
  if (!challenge.telegramId || !challenge.phone) return null;
  const telegramId = challenge.telegramId;
  const phone = challenge.phone;
  const displayName =
    challenge.telegramFirstName?.trim() ||
    (challenge.telegramUsername ? `@${challenge.telegramUsername.replace(/^@/, "")}` : null) ||
    `Telegram ${telegramId}`;

  let user =
    (await prisma.user.findUnique({ where: { telegramId } })) ||
    (await prisma.user.findUnique({ where: { phone } }));

  let isNew = false;
  if (!user) {
    isNew = true;
    user = await prisma.user.create({
      data: {
        name: displayName,
        phone,
        password: await hashPassword(`tg-${crypto.randomBytes(12).toString("hex")}`),
        role: "GUEST",
        verified: true,
        phoneVerified: true,
        telegramId,
        telegramUsername: challenge.telegramUsername,
        telegramPhotoUrl: challenge.telegramPhotoUrl,
        image: challenge.telegramPhotoUrl ?? undefined
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        phoneVerified: true,
        verified: true,
        telegramId: user.telegramId ?? telegramId,
        telegramUsername: challenge.telegramUsername ?? user.telegramUsername,
        telegramPhotoUrl: challenge.telegramPhotoUrl ?? user.telegramPhotoUrl,
        image: challenge.telegramPhotoUrl ?? user.image,
        name: user.name?.trim() ? user.name : displayName
      }
    });
  }

  return { userId: user.id, telegramId, isNew };
}

/** Notify user in Telegram after successful site verification. */
export async function notifyTelegramLoginSuccess(telegramId: string, languageCode?: string | null): Promise<void> {
  const locale = botLocaleFromTelegram(languageCode);
  const L = telegramBotMessages(locale);
  await sendTelegramMessage({
    chatId: Number(telegramId),
    text: L.confirmed
  });
}

export function parseLoginStartPayload(text: string | undefined): string | null {
  if (!text) return null;
  const parts = text.trim().split(/\s+/);
  const payload = parts[1] || (parts[0]?.startsWith("login_") ? parts[0] : null);
  if (!payload?.startsWith("login_")) return null;
  const token = payload.slice("login_".length).trim();
  return token.length >= 8 ? token : null;
}
