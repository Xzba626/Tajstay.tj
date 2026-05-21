import { getTelegramBotToken } from "@/lib/telegram/config";

type TelegramApiResult<T> = { ok: true; result: T } | { ok: false; description?: string };

type ReplyMarkup =
  | {
      keyboard: { text: string; request_contact?: boolean }[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | { remove_keyboard: true }
  | { inline_keyboard: { text: string; callback_data: string }[][] };

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

export type TelegramSendMessageResult = { ok: true } | { ok: false; error: string };

export async function sendTelegramMessage(params: {
  chatId: number | string;
  text: string;
  replyMarkup?: ReplyMarkup;
  removeKeyboard?: boolean;
}): Promise<TelegramSendMessageResult> {
  let markup: ReplyMarkup | undefined = params.replyMarkup;
  if (params.removeKeyboard) {
    markup = { remove_keyboard: true };
  }

  try {
    await callTelegram("sendMessage", {
      chat_id: params.chatId,
      text: params.text,
      parse_mode: "HTML",
      reply_markup: markup
    });
    return { ok: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
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
