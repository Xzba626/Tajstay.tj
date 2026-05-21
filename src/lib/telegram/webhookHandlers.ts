import { answerTelegramCallbackQuery, getTelegramUserPhotoUrl, sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";
import {
  confirmTelegramChallengeByCode,
  confirmTelegramChallengeByToken,
  linkTelegramToChallenge,
  parseConfirmCallbackData,
  parseLoginStartPayload
} from "@/lib/telegram/loginChallenge";

type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  language_code?: string;
};

type TgMessage = {
  message_id: number;
  chat: { id: number };
  text?: string;
  from?: TgUser;
};

type TgCallback = {
  id: string;
  from: TgUser;
  data?: string;
  message?: { chat: { id: number } };
};

export type TelegramUpdate = {
  message?: TgMessage;
  callback_query?: TgCallback;
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }
  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleCallback(cb: TgCallback): Promise<void> {
  const token = parseConfirmCallbackData(cb.data);
  const chatId = cb.message?.chat.id ?? cb.from.id;
  const locale = botLocaleFromTelegram(cb.from.language_code);
  const L = telegramBotMessages(locale);

  if (!token) {
    await answerTelegramCallbackQuery({ callbackQueryId: cb.id });
    return;
  }

  const ok = await confirmTelegramChallengeByToken(token, String(cb.from.id));
  await answerTelegramCallbackQuery({
    callbackQueryId: cb.id,
    text: ok ? L.confirmed : L.invalid
  });

  if (ok) {
    await sendTelegramMessage({ chatId, text: L.confirmed });
  }
}

async function handleMessage(message: TgMessage): Promise<void> {
  const from = message.from;
  if (!from) return;

  const chatId = message.chat.id;
  const locale = botLocaleFromTelegram(from.language_code);
  const L = telegramBotMessages(locale);
  const text = message.text?.trim() || "";

  const startToken = parseLoginStartPayload(text);
  if (startToken) {
    const photoUrl = await getTelegramUserPhotoUrl(from.id);
    const linked = await linkTelegramToChallenge(startToken, {
      id: from.id,
      username: from.username,
      first_name: from.first_name,
      photoUrl
    });

    if (!linked) {
      await sendTelegramMessage({ chatId, text: L.expired });
      return;
    }

    await sendTelegramMessage({
      chatId,
      text: L.welcome(linked.code),
      replyMarkup: {
        inline_keyboard: [[{ text: L.confirmButton, callback_data: `confirm_tg_login_${startToken}` }]]
      }
    });
    return;
  }

  const digits = text.replace(/\D/g, "");
  if (digits.length === 6) {
    const open = await findOpenChallengeForTelegram(String(from.id));
    if (!open) return;

    const ok = await confirmTelegramChallengeByCode(open.token, digits, String(from.id));
    if (ok) {
      await sendTelegramMessage({ chatId, text: L.confirmed });
    }
  }
}

async function findOpenChallengeForTelegram(telegramId: string): Promise<{ token: string } | null> {
  const { prisma } = await import("@/lib/prisma");
  const row = await prisma.telegramLoginChallenge.findFirst({
    where: {
      telegramId,
      confirmedAt: null,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" },
    select: { token: true }
  });
  return row;
}
