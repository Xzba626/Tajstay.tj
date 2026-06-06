"use client";

import type { ChatMessageDto } from "@/lib/chat/messageDto";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function ChatReadTicks({ locale, msg, isMine }: { locale: Locale; msg: ChatMessageDto; isMine: boolean }) {
  if (!isMine) return null;

  if (msg.readAt || msg.status === "READ") {
    return (
      <span className="chat-bubble__read chat-bubble__read--read" title={m(locale, "chat.readReceipt")}>
        ✓✓
      </span>
    );
  }

  return (
    <span className="chat-bubble__read chat-bubble__read--sent" title="Отправлено">
      ✓
    </span>
  );
}
