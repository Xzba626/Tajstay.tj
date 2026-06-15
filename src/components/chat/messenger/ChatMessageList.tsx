"use client";

import { useEffect, useMemo, useRef } from "react";
import { isSyntheticArchiveChatMessageId } from "@/lib/chat/archiveMessageIds";
import { groupChatMessages } from "@/lib/chat/groupMessages";
import type { ChatMessageDto } from "@/lib/chat/messageDto";
import { chatSenderBadgeClass, chatSenderLabel } from "@/lib/chat/senderLabel";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ChatReadTicks } from "@/components/chat/messenger/ChatReadTicks";
import type { ChatParticipantRole } from "@/components/chat/BookingRoom.types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

type Props = {
  locale: Locale;
  items: ChatMessageDto[];
  currentUserId: number;
  currentUserRole: ChatParticipantRole;
  chatArchived: boolean;
  canSend: boolean;
  typingName: string | null;
  onImageOpen: (url: string) => void;
  onAdminDelete?: (messageId: number) => void;
};

export function ChatMessageList({
  locale,
  items,
  currentUserId,
  currentUserRole,
  chatArchived,
  canSend,
  typingName,
  onImageOpen,
  onAdminDelete
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDone = useRef(false);
  const grouped = useMemo(() => groupChatMessages(items, locale), [items, locale]);
  const isAdmin = currentUserRole === "ADMIN";

  useEffect(() => {
    initialScrollDone.current = false;
  }, [items.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollToEnd = () => {
      el.scrollTo({ top: el.scrollHeight, behavior: initialScrollDone.current ? "smooth" : "auto" });
      initialScrollDone.current = true;
    };
    requestAnimationFrame(() => requestAnimationFrame(scrollToEnd));
  }, [items, typingName, chatArchived]);

  return (
    <div ref={scrollRef} className="messenger-messages">
      {chatArchived ? (
        <div className="messenger-messages__notice">
          Переписка перенесена в архив. Отправка недоступна.
        </div>
      ) : null}
      {!canSend && !chatArchived && items.length > 0 ? (
        <div className="messenger-messages__notice messenger-messages__notice--muted">
          Режим только чтения.
        </div>
      ) : null}
      {items.length === 0 ? (
        <div className="messenger-messages__empty">
          {chatArchived ? "Нет сообщений в архиве." : "Пока сообщений нет. Напишите первым."}
        </div>
      ) : (
        <div className="messenger-messages__list">
          {grouped.map((row) => {
            if (row.kind === "date") {
              return (
                <div key={row.key} className="chat-date-divider">
                  <span>{row.label}</span>
                </div>
              );
            }
            const msg = row.msg;
            const mine = msg.senderId === currentUserId;
            const system = msg.senderRole === "SYSTEM";

            if (system) {
              return (
                <div key={row.key} className="messenger-messages__system">
                  <div className="chat-bubble chat-bubble--system">{msg.message.replace(/^🛡️\s*/, "")}</div>
                </div>
              );
            }

            return (
              <div
                key={row.key}
                className={`chat-bubble-row ${mine ? "chat-bubble-row--mine" : "chat-bubble-row--theirs"}`}
              >
                <div className={`chat-bubble-stack ${mine ? "chat-bubble-stack--mine" : "chat-bubble-stack--theirs"}`}>
                  <span className={chatSenderBadgeClass(msg.senderRole, mine)}>
                    {chatSenderLabel(locale, msg, mine)}
                  </span>
                  <div className={`group chat-bubble ${mine ? "chat-bubble--mine" : "chat-bubble--theirs"}`}>
                  {isAdmin && onAdminDelete && !isSyntheticArchiveChatMessageId(msg.id) ? (
                    <button
                      type="button"
                      title="Скрыть"
                      onClick={() => onAdminDelete(msg.id)}
                      className="messenger-messages__delete"
                    >
                      ×
                    </button>
                  ) : null}
                  {msg.imageUrl ? (
                    isPdfUrl(msg.imageUrl) ? (
                      <a
                        href={msg.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="messenger-attachment messenger-attachment--pdf"
                      >
                        <span className="messenger-attachment__icon" aria-hidden>
                          PDF
                        </span>
                        <span className="messenger-attachment__label">{msg.message && msg.message !== "📎" ? msg.message : "Документ"}</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        title="Скрыть"
                        onClick={() => onAdminDelete(msg.id)}
                        className="messenger-messages__delete"
                      >
                        ×
                      </button>
                    ) : null}
                    {msg.imageUrl ? (
                      isPdfUrl(msg.imageUrl) ? (
                        <a
                          href={msg.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="messenger-attachment messenger-attachment--pdf"
                        >
                          <span className="messenger-attachment__icon" aria-hidden>
                            PDF
                          </span>
                          <span className="messenger-attachment__label">
                            {msg.message && msg.message !== "📎" ? msg.message : "Документ"}
                          </span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onImageOpen(msg.imageUrl!)}
                          className="messenger-attachment messenger-attachment--image"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.imageUrl} alt="" />
                        </button>
                      )
                    ) : null}
                    {msg.message && msg.message !== "📎" ? (
                      <div className="messenger-messages__text">{msg.message}</div>
                    ) : null}
                    <div className="messenger-messages__meta">
                      <span className="chat-bubble__time">{timeLabel(msg.createdAt)}</span>
                      <ChatReadTicks locale={locale} msg={msg} isMine={mine} />
                    </div>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {typingName ? (
        <div className="messenger-typing" aria-live="polite">
          {typingName} {m(locale, "chat.typing")}
          <span className="messenger-typing__dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </div>
      ) : null}
    </div>
  );
}
