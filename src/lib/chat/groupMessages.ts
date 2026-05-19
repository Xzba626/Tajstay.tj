export type ChatRow = {
  id: number;
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl?: string | null;
  createdAt: string;
};

export type ChatListItem =
  | { kind: "date"; key: string; label: string }
  | { kind: "message"; key: string; msg: ChatRow; showMeta: boolean };

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateSeparatorLabel(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = startOfLocalDay(new Date());
  const day = startOfLocalDay(d);
  const diff = (today.getTime() - day.getTime()) / 86_400_000;
  if (diff === 0) return locale === "en" ? "Today" : locale === "tg" ? "Имрӯз" : "Сегодня";
  if (diff === 1) return locale === "en" ? "Yesterday" : locale === "tg" ? "Дирӯз" : "Вчера";
  return d.toLocaleDateString(locale === "en" ? "en-US" : locale === "tg" ? "tg-TJ" : "ru-RU", {
    day: "numeric",
    month: "long"
  });
}

/** Date separators + hide repeated sender headers for consecutive bubbles. */
export function groupChatMessages(items: ChatRow[], locale: string): ChatListItem[] {
  const out: ChatListItem[] = [];
  let lastDay = "";
  let lastSenderKey = "";

  for (const msg of items) {
    const dayKey = msg.createdAt.slice(0, 10);
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      lastSenderKey = "";
      const label = dateSeparatorLabel(msg.createdAt, locale);
      if (label) out.push({ kind: "date", key: `d-${dayKey}`, label });
    }

    const senderKey =
      msg.senderRole === "SYSTEM" ? "SYSTEM" : `${msg.senderRole}:${msg.senderId}`;
    const showMeta = senderKey !== lastSenderKey || msg.senderRole === "SYSTEM";
    lastSenderKey = senderKey;

    out.push({ kind: "message", key: `m-${msg.id}`, msg, showMeta });
  }

  return out;
}
