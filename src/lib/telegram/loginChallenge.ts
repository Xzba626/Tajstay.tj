import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { buildUniquePlaceholderPhone } from "@/lib/auth/accountPhone";
import { hashPassword } from "@/lib/auth/password";
import { getTelegramBotUsername } from "@/lib/telegram/config";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_BYTES = 18;

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

export type TelegramChallengePublicStatus =
  | "pending"
  | "awaiting_confirm"
  | "confirmed"
  | "expired"
  | "used"
  | "not_found";

export async function createTelegramLoginChallenge(): Promise<{
  token: string;
  deepLink: string;
  expiresAt: string;
  expiresInSec: number;
}> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const code = generateLoginCode();
  const codeHash = hashTelegramLoginCode(token, code);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await prisma.telegramLoginChallenge.create({
    data: { token, codeHash, expiresAt }
  });

  return {
    token,
    deepLink: buildTelegramDeepLink(token),
    expiresAt: expiresAt.toISOString(),
    expiresInSec: Math.floor(CHALLENGE_TTL_MS / 1000)
  };
}

function isExpired(challenge: { expiresAt: Date; usedAt: Date | null }): boolean {
  return challenge.expiresAt.getTime() < Date.now() || Boolean(challenge.usedAt);
}

export async function getTelegramChallengeStatus(token: string): Promise<{
  status: TelegramChallengePublicStatus;
  telegramUsername?: string | null;
  expiresAt?: string;
}> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge) return { status: "not_found" };
  if (challenge.usedAt) return { status: "used", telegramUsername: challenge.telegramUsername };
  if (isExpired(challenge)) return { status: "expired" };
  if (challenge.confirmedAt) {
    return {
      status: "confirmed",
      telegramUsername: challenge.telegramUsername,
      expiresAt: challenge.expiresAt.toISOString()
    };
  }
  if (challenge.telegramId) {
    return {
      status: "awaiting_confirm",
      telegramUsername: challenge.telegramUsername,
      expiresAt: challenge.expiresAt.toISOString()
    };
  }
  return { status: "pending", expiresAt: challenge.expiresAt.toISOString() };
}

export async function linkTelegramToChallenge(
  token: string,
  telegram: {
    id: number;
    username?: string | null;
    first_name?: string | null;
    photoUrl?: string | null;
  }
): Promise<{ code: string; challenge: { id: number } } | null> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || isExpired(challenge) || challenge.confirmedAt) return null;

  const telegramId = String(telegram.id);
  const telegramUsername = telegram.username?.trim() || null;

  if (challenge.telegramId && challenge.telegramId !== telegramId) {
    return null;
  }

  const code = generateLoginCode();
  const codeHash = hashTelegramLoginCode(token, code);

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      telegramId,
      telegramUsername,
      telegramPhotoUrl: telegram.photoUrl ?? undefined,
      codeHash
    }
  });

  return { code, challenge: { id: challenge.id } };
}

export async function confirmTelegramChallengeByToken(token: string, telegramId: string): Promise<boolean> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || isExpired(challenge) || challenge.usedAt) return false;
  if (!challenge.telegramId || challenge.telegramId !== telegramId) return false;
  if (challenge.confirmedAt) return true;

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: { confirmedAt: new Date() }
  });
  return true;
}

export async function confirmTelegramChallengeByCode(token: string, code: string, telegramId: string): Promise<boolean> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || isExpired(challenge) || challenge.usedAt) return false;
  if (!challenge.telegramId || challenge.telegramId !== telegramId) return false;

  const normalized = code.replace(/\D/g, "").trim();
  if (normalized.length !== 6) return false;
  const expected = hashTelegramLoginCode(token, normalized);
  if (expected !== challenge.codeHash) return false;

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: { confirmedAt: new Date() }
  });
  return true;
}

export async function resolveTelegramLoginUser(token: string): Promise<{
  userId: number;
  telegramId: string;
} | null> {
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token } });
  if (!challenge || !challenge.confirmedAt || !challenge.telegramId) return null;
  if (isExpired(challenge) && !challenge.confirmedAt) return null;
  if (challenge.usedAt) return null;
  if (challenge.expiresAt.getTime() < Date.now()) return null;

  const telegramId = challenge.telegramId;

  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    const phone = await buildUniquePlaceholderPhone("telegram");
    const passwordHash = await hashPassword(`tg-${crypto.randomBytes(12).toString("hex")}`);
    const displayName = challenge.telegramUsername
      ? challenge.telegramUsername.startsWith("@")
        ? challenge.telegramUsername
        : `@${challenge.telegramUsername}`
      : `Telegram ${telegramId}`;
    user = await prisma.user.create({
      data: {
        name: displayName,
        phone,
        password: passwordHash,
        role: "GUEST",
        verified: true,
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
        telegramUsername: challenge.telegramUsername ?? user.telegramUsername,
        telegramPhotoUrl: challenge.telegramPhotoUrl ?? user.telegramPhotoUrl,
        image: challenge.telegramPhotoUrl ?? user.image
      }
    });
  }

  await prisma.telegramLoginChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() }
  });

  return { userId: user.id, telegramId };
}

export function parseLoginStartPayload(text: string | undefined): string | null {
  if (!text) return null;
  const parts = text.trim().split(/\s+/);
  const payload = parts[1] || (parts[0]?.startsWith("login_") ? parts[0] : null);
  if (!payload?.startsWith("login_")) return null;
  const token = payload.slice("login_".length).trim();
  return token.length >= 8 ? token : null;
}

export function parseConfirmCallbackData(data: string | undefined): string | null {
  if (!data?.startsWith("confirm_tg_login_")) return null;
  const token = data.slice("confirm_tg_login_".length).trim();
  return token.length >= 8 ? token : null;
}
