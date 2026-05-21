import { getTelegramUserPhotoUrl, sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";
import {
  attachPhoneAndSendCode,
  attachTelegramOnStart,
  parseLoginStartPayload
} from "@/lib/telegram/loginChallenge";

type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  language_code?: string;
};

type TgContact = {
  phone_number: string;
  user_id?: number;
  first_name?: string;
};

type TgMessage = {
  message_id: number;
  chat: { id: number };
  text?: string;
  contact?: TgContact;
  from?: TgUser;
};

export type TelegramUpdate = {
  message?: TgMessage;
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleMessage(message: TgMessage): Promise<void> {
  const from = message.from;
  if (!from) return;

  const chatId = message.chat.id;
  const locale = botLocaleFromTelegram(from.language_code);
  const L = telegramBotMessages(locale);
  const telegramId = String(from.id);

  if (message.contact?.phone_number) {
    const open = await findOpenChallengeForTelegram(telegramId);
    if (!open) return;

    const result = await attachPhoneAndSendCode(
      open.token,
      telegramId,
      message.contact.phone_number,
      from.language_code
    );

    if (!result.ok) {
      const text =
        result.reason === "cooldown"
          ? L.cooldown
          : result.reason === "expired"
            ? L.expired
            : L.invalid;
      await sendTelegramMessage({ chatId, text });
    }
    return;
  }

  const startToken = parseLoginStartPayload(message.text?.trim());
  if (startToken) {
    const photoUrl = await getTelegramUserPhotoUrl(from.id);
    const ok = await attachTelegramOnStart(startToken, {
      id: from.id,
      username: from.username,
      first_name: from.first_name,
      photoUrl,
      language_code: from.language_code
    });

    if (!ok) {
      await sendTelegramMessage({ chatId, text: L.expired });
      return;
    }

    await sendTelegramMessage({
      chatId,
      text: L.startWelcome,
      replyMarkup: {
        keyboard: [[{ text: L.sharePhoneButton, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return;
  }
}

async function findOpenChallengeForTelegram(telegramId: string): Promise<{ token: string } | null> {
  const { prisma } = await import("@/lib/prisma");
  const row = await prisma.telegramLoginChallenge.findFirst({
    where: {
      telegramId,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" },
    select: { token: true }
  });
  return row;
}
