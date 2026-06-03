import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashOtpCode, generateOtpCode, verifyOtpCodeHash } from "@/lib/auth/otp";
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

/** Mark expired pending rows so polling/confirm do not treat them as active. */
export async function expireStaleTelegramChangeRequests(userId?: number) {
  const now = new Date();
  await prisma.telegramChangeRequest.updateMany({
    where: {
      usedAt: null,
      expiresAt: { lt: now },
      ...(userId != null ? { userId } : {})
    },
    data: { usedAt: now }
  });
}

export async function startTelegramChangeSession(userId: number) {
  await expireStaleTelegramChangeRequests(userId);

  const existing = await prisma.telegramChangeRequest.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return {
      sessionToken: existing.sessionToken,
      deepLink: buildChangeTelegramDeepLink(existing.sessionToken),
      expiresAt: existing.expiresAt.toISOString(),
      expiresInSec: Math.max(0, Math.floor((existing.expiresAt.getTime() - Date.now()) / 1000))
    };
  }

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
): Promise<{ ok: true; code: string } | { ok: false; reason: "not_found" | "expired" | "used" | "taken" }> {
  await expireStaleTelegramChangeRequests();

  const row = await prisma.telegramChangeRequest.findUnique({ where: { sessionToken } });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.telegramChangeRequest.update({
      where: { id: row.id },
      data: { usedAt: new Date() }
    });
    return { ok: false, reason: "expired" };
  }

  const telegramId = String(telegram.id);
  const taken = await prisma.user.findFirst({
    where: { telegramId, NOT: { id: row.userId } },
    select: { id: true }
  });
  if (taken) return { ok: false, reason: "taken" };

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

export type ConfirmTelegramChangeResult =
  | {
      ok: true;
      telegramId: string;
      telegramUsername: string | null;
      telegramPhotoUrl: string | null;
      log: {
        userId: number;
        pendingId: number;
        beforeTelegramId: string | null;
        afterTelegramId: string;
      };
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "expired"
        | "used"
        | "no_code"
        | "invalid"
        | "taken"
        | "persist_failed";
    };

/**
 * Confirms Telegram change using ONLY pending row in DB (sessionToken + OTP).
 * Never reads telegramId from the HTTP body — only from TelegramChangeRequest.telegramId.
 */
export async function confirmTelegramChange(
  userId: number,
  sessionToken: string,
  code: string
): Promise<ConfirmTelegramChangeResult> {
  await expireStaleTelegramChangeRequests(userId);

  const normalized = code.replace(/\D/g, "").trim();
  if (normalized.length !== 6) {
    return { ok: false, reason: "invalid" };
  }

  const row = await prisma.telegramChangeRequest.findFirst({
    where: {
      userId,
      sessionToken,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!row) return { ok: false, reason: "not_found" };
  if (!row.codeHash || !row.telegramId) return { ok: false, reason: "no_code" };

  if (!verifyOtpCodeHash(normalized, row.codeHash)) {
    return { ok: false, reason: "invalid" };
  }

  const pendingTelegramId = row.telegramId;
  const pendingUsername = row.telegramUsername;
  const pendingPhotoUrl = row.telegramPhotoUrl;

  const taken = await prisma.user.findFirst({
    where: { telegramId: pendingTelegramId, NOT: { id: userId } },
    select: { id: true }
  });
  if (taken) return { ok: false, reason: "taken" };

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, telegramUsername: true, image: true, telegramPhotoUrl: true }
  });
  if (!before) return { ok: false, reason: "not_found" };

  const shouldSetImage =
    pendingPhotoUrl && (!before.image || before.image === before.telegramPhotoUrl);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          telegramId: pendingTelegramId,
          telegramUsername: pendingUsername,
          telegramPhotoUrl: pendingPhotoUrl,
          ...(shouldSetImage ? { image: pendingPhotoUrl } : {})
        },
        select: {
          id: true,
          telegramId: true,
          telegramUsername: true,
          telegramPhotoUrl: true
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

      return user;
    });

    if (updated.telegramId !== pendingTelegramId) {
      return { ok: false, reason: "persist_failed" };
    }

    const verify = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, telegramUsername: true, telegramPhotoUrl: true }
    });

    if (!verify || verify.telegramId !== pendingTelegramId) {
      return { ok: false, reason: "persist_failed" };
    }

    return {
      ok: true,
      telegramId: verify.telegramId!,
      telegramUsername: verify.telegramUsername,
      telegramPhotoUrl: verify.telegramPhotoUrl,
      log: {
        userId,
        pendingId: row.id,
        beforeTelegramId: before.telegramId,
        afterTelegramId: verify.telegramId!
      }
    };
  } catch (err) {
    console.error("[telegram/change/confirm] transaction failed", err);
    return { ok: false, reason: "persist_failed" };
  }
}
