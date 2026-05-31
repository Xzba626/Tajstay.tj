import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashOtpCode, generateOtpCode } from "@/lib/auth/otp";
import { getTelegramBotUsername } from "@/lib/telegram/config";
import { getTelegramUserPhotoUrl, sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";

const CHANGE_TTL_MS = 10 * 60 * 1000;
const TOKEN_BYTES = 16;
const START_PREFIX = "cht_";

export function parseChangeTelegramStartPayload(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/start")) return null;
  const parts = trimmed.split(/\s+/);
  const payload = parts[1]?.trim();
  if (!payload?.startsWith(START_PREFIX)) return null;
  return payload.slice(START_PREFIX.length);
}

export function buildChangeTelegramDeepLink(sessionToken: string): string {
  const bot = getTelegramBotUsername().replace(/^@/, "");
  return `https://t.me/${bot}?start=${START_PREFIX}${sessionToken}`;
}

export async function startTelegramChangeSession(userId: number) {
  await prisma.telegramChangeRequest.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() }
  });

  const sessionToken = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + CHANGE_TTL_MS);

  await prisma.telegramChangeRequest.create({
    data: { userId, sessionToken, expiresAt }
  });

  return {
    sessionToken,
    deepLink: buildChangeTelegramDeepLink(sessionToken),
    expiresAt: expiresAt.toISOString(),
    expiresInSec: Math.floor(CHANGE_TTL_MS / 1000)
  };
}

/** Bot: user opened deep link or sent /change_telegram with active session. */
export async function attachTelegramChangeFromBot(
  sessionToken: string,
  telegram: {
    id: number;
    username?: string | null;
    first_name?: string | null;
    language_code?: string | null;
  }
): Promise<{ ok: true; code: string } | { ok: false; reason: "not_found" | "expired" | "used" }> {
  const row = await prisma.telegramChangeRequest.findUnique({ where: { sessionToken } });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const telegramId = String(telegram.id);
  const taken = await prisma.user.findFirst({
    where: { telegramId, NOT: { id: row.userId } },
    select: { id: true }
  });
  if (taken) return { ok: false, reason: "not_found" };

  const photoUrl = await getTelegramUserPhotoUrl(telegram.id);
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);

  await prisma.telegramChangeRequest.update({
    where: { id: row.id },
    data: {
      telegramId,
      telegramUsername: telegram.username?.trim() || null,
      telegramFirstName: telegram.first_name?.trim() || null,
      telegramPhotoUrl: photoUrl,
      codeHash
    }
  });

  const locale = botLocaleFromTelegram(telegram.language_code);
  const L = telegramBotMessages(locale);
  await sendTelegramMessage({
    chatId: telegram.id,
    text: L.changeTelegramCode(code)
  });

  return { ok: true, code };
}

export async function confirmTelegramChange(userId: number, sessionToken: string, code: string) {
  const row = await prisma.telegramChangeRequest.findUnique({ where: { sessionToken } });
  if (!row || row.userId !== userId) return { ok: false as const, reason: "not_found" as const };
  if (row.usedAt) return { ok: false as const, reason: "used" as const };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "expired" as const };
  if (!row.codeHash || !row.telegramId) return { ok: false as const, reason: "no_code" as const };

  const normalized = code.replace(/\D/g, "").trim();
  if (normalized.length !== 6 || hashOtpCode(normalized) !== row.codeHash) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const taken = await prisma.user.findFirst({
    where: { telegramId: row.telegramId, NOT: { id: userId } },
    select: { id: true }
  });
  if (taken) return { ok: false as const, reason: "taken" as const };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        telegramId: row.telegramId,
        telegramUsername: row.telegramUsername,
        telegramPhotoUrl: row.telegramPhotoUrl,
        image: row.telegramPhotoUrl ?? undefined
      }
    });
    await tx.telegramChangeRequest.update({
      where: { id: row.id },
      data: { usedAt: new Date() }
    });
    await tx.telegramChangeRequest.updateMany({
      where: { userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() }
    });
  });

  return { ok: true as const };
}
