"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import type { ChatMessageDto } from "@/lib/chat/messageDto";
import type { Locale } from "@/lib/i18n/locale";
import {
  bookingChatChannelName,
  isPusherClientConfigured,
  PUSHER_EVENTS,
  pusherCluster,
  pusherPublicKey
} from "@/lib/pusher/config";

export type LiveBookingSnap = {
  status: string;
  paymentStatus: string;
  expiresAt: string | null;
  proofReviewDeadlineAt: string | null;
  paymentTimerPaused: boolean;
};

function mapChatApiError(raw: string | undefined): string {
  const v = (raw || "").trim();
  const lower = v.toLowerCase();
  if (lower === "invalid bookingid" || v === "Invalid bookingId")
    return "Неверная ссылка на чат. Обновите страницу или откройте бронь из «Мои бронирования».";
  if (lower === "invalid" || lower === "invalid id" || lower === "invalid payload")
    return "Запрос отклонён. Обновите страницу, выйдите и войдите снова или откройте чат из «Мои бронирования».";
  if (v === "Unauthorized") return "Сессия истекла — войдите снова.";
  if (v === "Forbidden") return "Нет доступа к этому чату.";
  if (lower === "not found") return "Бронирование не найдено.";
  return v || "";
}

function messageFromChatResponse(res: Response, json: { error?: string }): string {
  const mapped = mapChatApiError(json.error);
  if (mapped) return mapped;
  if (res.status === 401) return "Сессия истекла — войдите снова.";
  if (res.status === 403) return "Нет доступа к этому чату.";
  if (res.status === 404) return "Бронирование не найдено.";
  if (res.status >= 500) return "Сервер временно недоступен. Попробуйте через минуту.";
  return `Ошибка сети (${res.status})`;
}

type MessagesPayload = {
  messages?: ChatMessageDto[];
  chatArchived?: boolean;
  canSend?: boolean;
  booking?: LiveBookingSnap;
};

export function useBookingChat(opts: {
  bookingId: number;
  currentUserId: number;
  locale: Locale;
  bookingStatus: string;
}) {
  const { bookingId, currentUserId, locale, bookingStatus } = opts;

  const [items, setItems] = useState<ChatMessageDto[]>([]);
  const [chatArchived, setChatArchived] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [liveBooking, setLiveBooking] = useState<LiveBookingSnap | null>(null);
  const [uiStatus, setUiStatus] = useState(bookingStatus);
  const [error, setError] = useState<string | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);

  const applyMessagesPayload = useCallback((json: MessagesPayload) => {
    setItems(Array.isArray(json.messages) ? json.messages : []);
    setChatArchived(Boolean(json.chatArchived));
    setCanSend(json.canSend !== false);
    if (json.booking) {
      setLiveBooking(json.booking);
      setUiStatus(json.booking.status);
    }
  }, []);

  const pull = useCallback(async () => {
    const res = await fetch(`/api/chat/booking/${bookingId}/messages`, { cache: "no-store", credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as MessagesPayload & { error?: string };
    if (!res.ok) throw new Error(messageFromChatResponse(res, json));
    setError(null);
    applyMessagesPayload(json);
  }, [bookingId, applyMessagesPayload]);

  const mergeMessage = useCallback((msg: ChatMessageDto) => {
    setItems((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  useEffect(() => {
    setUiStatus(bookingStatus);
  }, [bookingStatus]);

  useEffect(() => {
    if (!Number.isFinite(bookingId) || bookingId < 1) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/chat/booking/${bookingId}/init`, {
          method: "POST",
          credentials: "include",
          headers: { accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ locale })
        });
        if (cancelled || !r.ok) return;
        await pull();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, locale, pull]);

  useEffect(() => {
    let mounted = true;
    pull().catch((e) => {
      if (mounted) setError(e instanceof Error ? e.message : "Не удалось загрузить чат");
    });

    let es: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      es = new EventSource(`/api/chat/booking/${bookingId}/stream`);
      es.onmessage = () => {
        if (!mounted) return;
        pull().catch(() => undefined);
      };
      es.onerror = () => {
        es?.close();
        es = null;
      };
    }

    const pollMs = isPusherClientConfigured() ? 12000 : 3500;
    const t = window.setInterval(() => {
      if (!mounted) return;
      pull().catch(() => undefined);
    }, pollMs);

    return () => {
      mounted = false;
      window.clearInterval(t);
      es?.close();
    };
  }, [pull, bookingId]);

  useEffect(() => {
    if (!isPusherClientConfigured() || !Number.isFinite(bookingId) || bookingId < 1) return;

    const pusher = new Pusher(pusherPublicKey()!, {
      cluster: pusherCluster(),
      authEndpoint: "/api/pusher/auth",
      auth: { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    });

    const channel = pusher.subscribe(bookingChatChannelName(bookingId));

    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: { message?: ChatMessageDto }) => {
      if (data?.message) mergeMessage(data.message);
    });

    channel.bind(PUSHER_EVENTS.MESSAGE_READ, (data: { readerUserId?: number; readAt?: string }) => {
      if (!data?.readAt || data.readerUserId === currentUserId) return;
      setItems((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId ? { ...m, readAt: data.readAt!, status: "READ" } : m
        )
      );
    });

    channel.bind(PUSHER_EVENTS.TYPING, (data: { userId?: number; name?: string; typing?: boolean }) => {
      if (!data?.userId || data.userId === currentUserId) return;
      if (typingClearRef.current) {
        clearTimeout(typingClearRef.current);
        typingClearRef.current = null;
      }
      if (data.typing && data.name) {
        setTypingName(data.name);
        typingClearRef.current = setTimeout(() => setTypingName(null), 3000);
      } else {
        setTypingName(null);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(bookingChatChannelName(bookingId));
      pusher.disconnect();
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
    };
  }, [bookingId, currentUserId, mergeMessage]);

  const notifyTyping = useCallback(
    (typing: boolean) => {
      if (!isPusherClientConfigured()) return;
      void fetch(`/api/chat/booking/${bookingId}/typing`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing })
      }).catch(() => undefined);
    },
    [bookingId]
  );

  const onComposeInput = useCallback(() => {
    if (!typingSentRef.current) {
      typingSentRef.current = true;
      notifyTyping(true);
    }
    if (typingClearRef.current) clearTimeout(typingClearRef.current);
    typingClearRef.current = setTimeout(() => {
      typingSentRef.current = false;
      notifyTyping(false);
    }, 2000);
  }, [notifyTyping]);

  const sendMessage = useCallback(
    async (payload: { text: string; file?: File | null }) => {
      const message = payload.text.trim();
      const file = payload.file ?? null;
      if (!message && !file) return;

      notifyTyping(false);
      typingSentRef.current = false;

      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.set("message", message);
        fd.set("file", file);
        res = await fetch(`/api/chat/booking/${bookingId}/messages`, {
          method: "POST",
          credentials: "include",
          body: fd
        });
      } else {
        res = await fetch(`/api/chat/booking/${bookingId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message })
        });
      }

      const json = (await res.json().catch(() => ({}))) as MessagesPayload & { error?: string };
      if (!res.ok) throw new Error(messageFromChatResponse(res, json));
      applyMessagesPayload(json);
    },
    [bookingId, applyMessagesPayload, notifyTyping]
  );

  return {
    items,
    chatArchived,
    canSend,
    liveBooking,
    uiStatus,
    setUiStatus,
    error,
    setError,
    typingName,
    pull,
    sendMessage,
    onComposeInput,
    applyMessagesPayload
  };
}
