"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import type { ChatMessageDto } from "@/lib/chat/messageDto";
import {
  CHAT_POLL_INTERVAL_MS,
  connectBookingChatStream,
  fetchChatMessages,
  postChatMessage,
  type ChatConnectionStatus
} from "@/lib/chat/chatClient";
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
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>("connecting");
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const pusherEnabledRef = useRef(false);

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
    const json = await fetchChatMessages(bookingId);
    setError(null);
    applyMessagesPayload(json);
    setConnectionStatus((prev) => (prev === "offline" ? "polling" : prev));
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
        /* init is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, locale, pull]);

  useEffect(() => {
    if (!Number.isFinite(bookingId) || bookingId < 1) return;

    let mounted = true;

    pull().catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e.message : "Не удалось загрузить чат");
      setConnectionStatus("offline");
    });

    const disconnectStream = connectBookingChatStream(
      bookingId,
      () => {
        if (!mounted) return;
        pull().catch(() => undefined);
      },
      (status) => {
        if (!mounted) return;
        setConnectionStatus(status);
      }
    );

    const poll = window.setInterval(() => {
      if (!mounted) return;
      pull().catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Не удалось обновить чат");
        setConnectionStatus("offline");
      });
    }, CHAT_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(poll);
      disconnectStream();
    };
  }, [pull, bookingId]);

  useEffect(() => {
    if (!isPusherClientConfigured() || !Number.isFinite(bookingId) || bookingId < 1) return;

    let cancelled = false;
    let pusher: Pusher | null = null;

    void (async () => {
      try {
        const statusRes = await fetch("/api/pusher/status", { cache: "no-store" });
        const statusJson = (await statusRes.json().catch(() => ({}))) as { enabled?: boolean };
        if (!statusJson.enabled || cancelled) return;

        pusherEnabledRef.current = true;
        pusher = new Pusher(pusherPublicKey()!, {
          cluster: pusherCluster(),
          channelAuthorization: {
            endpoint: "/api/pusher/auth",
            transport: "ajax"
          }
        });

        const channel = pusher.subscribe(bookingChatChannelName(bookingId));

        channel.bind("pusher:subscription_error", () => {
          pusherEnabledRef.current = false;
          pusher?.disconnect();
          pusher = null;
        });

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
      } catch {
        pusherEnabledRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      pusherEnabledRef.current = false;
      if (pusher) {
        pusher.unsubscribe(bookingChatChannelName(bookingId));
        pusher.disconnect();
      }
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
    };
  }, [bookingId, currentUserId, mergeMessage]);

  const notifyTyping = useCallback(
    (typing: boolean) => {
      if (!pusherEnabledRef.current) return;
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
    if (!pusherEnabledRef.current) return;
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

      const json = await postChatMessage(bookingId, { text: message, file });
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
    connectionStatus,
    pull,
    sendMessage,
    onComposeInput,
    applyMessagesPayload
  };
}
