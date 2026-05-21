import { getTelegramBotToken } from "@/lib/telegram/config";

type TelegramApiResult<T> = { ok: true; result: T } | { ok: false; description?: string };

async function callTelegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) throw new Error("Telegram bot is not configured");

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => ({}))) as TelegramApiResult<T>;
  if (!json.ok) {
    throw new Error(json.description || `Telegram API ${method} failed`);
  }
  return json.result;
}

export async function sendTelegramMessage(params: {
  chatId: number | string;
  text: string;
  replyMarkup?: {
    inline_keyboard: { text: string; callback_data: string }[][];
  };
}): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: "HTML",
    reply_markup: params.replyMarkup
  });
}

export async function getTelegramUserPhotoUrl(userId: number): Promise<string | null> {
  try {
    const photos = await callTelegram<{
      photos?: { file_id: string }[][];
    }>("getUserProfilePhotos", { user_id: userId, limit: 1 });
    const fileId = photos.photos?.[0]?.[0]?.file_id;
    if (!fileId) return null;
    const file = await callTelegram<{ file_path?: string }>("getFile", { file_id: fileId });
    const token = getTelegramBotToken();
    if (!file.file_path || !token) return null;
    return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  } catch {
    return null;
  }
}

export async function answerTelegramCallbackQuery(params: {
  callbackQueryId: string;
  text?: string;
}): Promise<void> {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: params.callbackQueryId,
    text: params.text,
    show_alert: Boolean(params.text)
  });
}
