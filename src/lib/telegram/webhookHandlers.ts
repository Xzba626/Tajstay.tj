import { getTelegramUserPhotoUrl, sendTelegramMessage } from "@/lib/telegram/api";
import { botLocaleFromTelegram, telegramBotMessages } from "@/lib/telegram/botMessages";
import {
  attachPhoneAndSendCode,
  attachTelegramOnStart,
  parseLoginStartPayload
} from "@/lib/telegram/loginChallenge";
import { attachTelegramOnLinkStart, parseLinkStartPayload } from "@/lib/telegram/accountLink";

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
  update_id?: number;
  message?: TgMessage;
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  console.log("[telegram/webhook] incoming update", { hasMessage: Boolean(update.message) });

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
    if (message.contact.user_id === undefined || message.contact.user_id !== from.id) {
      console.warn("[telegram/webhook] rejected contact: user_id mismatch or missing", { telegramId });
      const sent = await sendTelegramMessage({ chatId, text: L.phoneRequired });
      console.log("[telegram/webhook] sendMessage result (contact rejected)", sent);
      return;
    }

    console.log("[telegram/webhook] own contact received", { telegramId });

    const open = await findOpenChallengeForTelegram(telegramId);
    if (!open) {
      const sent = await sendTelegramMessage({ chatId, text: L.openSiteToSignIn });
      console.log("[telegram/webhook] sendMessage result (no challenge)", sent);
      return;
    }

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
      const sent = await sendTelegramMessage({ chatId, text });
      console.log("[telegram/webhook] sendMessage result (contact error)", sent, result.reason);
    } else {
      console.log("[telegram/webhook] code sent", { telegramId });
    }
    return;
  }

  const text = message.text?.trim() ?? "";
  const linkToken = parseLinkStartPayload(text);
  const startToken = parseLoginStartPayload(text);
  console.log("[telegram/webhook] start payload", {
    hasStartToken: Boolean(startToken),
    hasLinkToken: Boolean(linkToken)
  });

  if (text.startsWith("/start")) {
    const photoUrl = await getTelegramUserPhotoUrl(from.id);
    const tgIdentity = {
      id: from.id,
      username: from.username,
      first_name: from.first_name,
      photoUrl,
      language_code: from.language_code
    };

    if (linkToken) {
      const ok = await attachTelegramOnLinkStart(linkToken, tgIdentity);
      if (!ok) {
        const sent = await sendTelegramMessage({ chatId, text: L.expired });
        console.log("[telegram/webhook] sendMessage result (link expired)", sent);
      } else {
        console.log("[telegram/webhook] account link start ok", { telegramId });
      }
      return;
    }

    if (!startToken) {
      const sent = await sendTelegramMessage({ chatId, text: L.openSiteToSignIn });
      console.log("[telegram/webhook] sendMessage result (plain start)", sent);
      return;
    }

    const ok = await attachTelegramOnStart(startToken, tgIdentity);

    if (!ok) {
      const sent = await sendTelegramMessage({ chatId, text: L.expired });
      console.log("[telegram/webhook] sendMessage result (expired token)", sent);
      return;
    }

    const sent = await sendTelegramMessage({
      chatId,
      text: L.startWelcome,
      replyMarkup: {
        keyboard: [[{ text: L.sharePhoneButton, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    console.log("[telegram/webhook] sendMessage result (login start)", sent);
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
