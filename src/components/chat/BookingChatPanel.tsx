"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { isSyntheticArchiveChatMessageId } from "@/lib/chat/archiveMessageIds";
import { groupChatMessages } from "@/lib/chat/groupMessages";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { PaymentCountdown } from "@/app/payment/[code]/PaymentCountdown";
import { TrustBadges } from "@/components/auth/TrustBadges";
import type { TrustBadge } from "@/lib/auth/trustBadges";

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
  if (lower === "admin not configured") return "Поддержка временно недоступна. Напишите через страницу «Контакты».";
  return v || "";
}

function messageFromChatResponse(res: Response, json: { error?: string }): string {
  const mapped = mapChatApiError(json.error);
  if (mapped) return mapped;
  if (res.status === 401) return "Сессия истекла — войдите снова.";
  if (res.status === 404) return "Бронирование не найдено.";
  if (res.status === 403) return "Нет доступа к этому чату.";
  if (res.status >= 500) return "Сервер временно недоступен. Попробуйте через минуту.";
  return `Ошибка сети (${res.status})`;
}

type ChatMessage = {
  id: number;
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl?: string | null;
  status?: string;
  readAt?: string | null;
  createdAt: string;
};

const HOST_QUICK_KEYS = ["1", "2", "3", "4", "5"] as const;
const ADMIN_QUICK_KEYS = ["1", "2", "3", "4"] as const;

export type LiveBookingSnap = {
  status: string;
  paymentStatus: string;
  expiresAt: string | null;
  proofReviewDeadlineAt: string | null;
  paymentTimerPaused: boolean;
};

export type BookingChatPanelProps = {
  bookingId: number;
  currentUserId: number;
  currentUserRole: "GUEST" | "OWNER" | "ADMIN";
  bookingStatus: string;
  paymentStatus: string;
  /** Язык интерфейса (cookie) — приветствие в чате и быстрые ответы */
  locale?: Locale;
  checkInIso?: string;
  paymentCode?: string;
  title?: string;
  /** page — встроен в макет; overlay — полноэкранная панель поверх страницы */
  presentation?: "page" | "overlay";
  onClose?: () => void;
  hotelName?: string;
  roomTitle?: string;
  counterpartPreview?: string;
  counterpartTrustBadges?: TrustBadge[];
  /** Компактная высота для экрана «Сделка» */
  density?: "default" | "compact";
  /** На странице оплаты скрыть ссылку «Загрузить чек» */
  suppressPaymentDeepLink?: boolean;
  /** Действия проверки оплаты вынесены в PaymentReviewCard (sidebar) */
  suppressReviewActions?: boolean;
  /** Внутри BookingRoom: без дублирующего header, на всю высоту колонки */
  embeddedInRoom?: boolean;
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isOnOrAfterLocalDay(now: Date, checkIn: Date): boolean {
  return startOfLocalDay(now).getTime() >= startOfLocalDay(checkIn).getTime();
}

function statusPillClass(status: string): string {
  if (status === "CONFIRMED") {
    return "bg-gradient-to-r from-emerald-500/25 via-emerald-400/15 to-teal-400/15 text-emerald-100 ring-emerald-300/25";
  }
  if (status === "WAITING_PAYMENT" || status === "WAIT_PROOF") {
    return "bg-[rgba(255,184,48,0.14)] text-[#ffe9b8] ring-[rgba(255,184,48,0.25)]";
  }
  if (status === "ON_REVIEW") {
    return "bg-[rgba(99,102,241,0.14)] text-[#dbe3ff] ring-[rgba(99,102,241,0.26)]";
  }
  if (status === "CHECKED_IN") {
    return "bg-[rgba(54,207,201,0.14)] text-[#d7fffb] ring-[rgba(54,207,201,0.28)]";
  }
  if (status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED") {
    return "bg-[rgba(255,77,106,0.14)] text-[#ffd6dc] ring-[rgba(255,77,106,0.25)]";
  }
  return "bg-white/5 text-slate-200 ring-white/10";
}

function statusLabelLocalized(status: string, locale: Locale): string {
  const label = m(locale, `status.${status}`);
  if (label && label !== `status.${status}`) return label;
  return statusLabelRu(status);
}

function statusLabelRu(status: string): string {
  switch (status) {
    case "WAITING_PAYMENT":
    case "WAIT_PROOF":
    case "PENDING_OWNER":
      return "Ожидает оплаты";
    case "ON_REVIEW":
      return "На проверке";
    case "CONFIRMED":
    case "CHECKED_IN":
      return "Подтверждено";
    case "COMPLETED":
    case "REJECTED":
    case "CANCELLED":
    case "EXPIRED":
    case "CANCELLED_BY_GUEST":
      return "Архив";
    default:
      return status;
  }
}

function avatarLetter(name: string): string {
  const t = (name || "?").trim();
  return t.slice(0, 1).toUpperCase();
}

function roleAccent(role: string): { bubble: string; meta: string; avatar: string; label: string } {
  if (role === "OWNER") {
    return {
      bubble:
        "bg-gradient-to-br from-sky-600 to-sky-700 text-white ring-1 ring-sky-300/25 shadow-[0_4px_18px_-8px_rgba(56,189,248,0.45)]",
      meta: "text-sky-100/80",
      avatar: "bg-gradient-to-br from-sky-500/30 to-sky-700/25 text-sky-100 ring-sky-300/25",
      label: "text-sky-200"
    };
  }
  if (role === "ADMIN") {
    return {
      bubble:
        "bg-gradient-to-br from-violet-600 to-indigo-700 text-white ring-1 ring-violet-300/25 shadow-[0_4px_18px_-8px_rgba(139,92,246,0.45)]",
      meta: "text-violet-100/80",
      avatar: "bg-gradient-to-br from-violet-500/30 to-indigo-700/25 text-violet-100 ring-violet-300/25",
      label: "text-violet-200"
    };
  }
  if (role === "GUEST") {
    return {
      bubble:
        "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-1 ring-emerald-300/25 shadow-[0_4px_18px_-8px_rgba(16,185,129,0.45)]",
      meta: "text-emerald-100/80",
      avatar: "bg-gradient-to-br from-emerald-500/30 to-teal-600/25 text-emerald-100 ring-emerald-300/25",
      label: "text-emerald-200"
    };
  }
  return {
    bubble: "bg-slate-800 text-slate-100 ring-1 ring-white/10",
    meta: "text-slate-400",
    avatar: "bg-white/10 text-slate-200 ring-white/10",
    label: "text-slate-300"
  };
}

function roleShortLabel(role: string, locale: Locale): string {
  if (role === "GUEST") return m(locale, "bookingRoom.counterpartGuest") || "Гость";
  if (role === "OWNER") return m(locale, "bookingRoom.counterpartOwner") || "Владелец";
  if (role === "ADMIN") return "Поддержка";
  return role;
}

export function BookingChatPanel({
  bookingId,
  currentUserId,
  currentUserRole,
  bookingStatus,
  paymentStatus,
  locale = "ru",
  checkInIso,
  paymentCode,
  title = "Чат",
  presentation = "page",
  onClose,
  hotelName,
  roomTitle,
  counterpartPreview,
  counterpartTrustBadges = [],
  density = "default",
  suppressPaymentDeepLink = false,
  suppressReviewActions = false,
  embeddedInRoom = false
}: BookingChatPanelProps) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [uiStatus, setUiStatus] = useState<string>(bookingStatus);
  const [liveBooking, setLiveBooking] = useState<LiveBookingSnap | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmAdminCancelOpen, setConfirmAdminCancelOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [chatArchived, setChatArchived] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const applyMessagesPayload = useCallback((json: {
    messages?: ChatMessage[];
    chatArchived?: boolean;
    canSend?: boolean;
    booking?: LiveBookingSnap;
  }) => {
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
    const json = (await res.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
      error?: string;
      chatArchived?: boolean;
      canSend?: boolean;
      booking?: LiveBookingSnap;
    };
    if (!res.ok) {
      throw new Error(messageFromChatResponse(res, json));
    }
    setError(null);
    applyMessagesPayload(json);
  }, [bookingId, applyMessagesPayload]);

  useEffect(() => {
    setUiStatus(bookingStatus);
  }, [bookingStatus]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

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

    const t = window.setInterval(() => {
      if (!mounted) return;
      pull().catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : "Не удалось загрузить чат");
      });
    }, es ? 8000 : 3500);

    return () => {
      mounted = false;
      window.clearInterval(t);
      es?.close();
    };
  }, [pull, bookingId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [items.length, chatArchived]);

  const canSubmit = useMemo(() => (text.trim().length > 0 || !!file) && !sending && canSend && !chatArchived, [text, file, sending, canSend, chatArchived]);

  const isGuest = currentUserRole === "GUEST";
  const isOwner = currentUserRole === "OWNER";
  const isAdmin = currentUserRole === "ADMIN";

  const effectiveStatus = liveBooking?.status ?? uiStatus;
  const effectivePaymentStatus = liveBooking?.paymentStatus ?? paymentStatus;

  const checkIn = useMemo(() => {
    const d = checkInIso ? new Date(checkInIso) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  }, [checkInIso]);

  async function sendQuickReply(messageText: string) {
    const t = messageText.trim();
    if (!t || !canSend || sending || chatArchived) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/booking/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: t })
      });
      const json = (await res.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
        canSend?: boolean;
        chatArchived?: boolean;
        booking?: LiveBookingSnap;
      };
      if (!res.ok) throw new Error(messageFromChatResponse(res, json));
      applyMessagesPayload(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  async function submitAdminCancel() {
    if (!isAdmin || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        credentials: "include"
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Не удалось отменить бронь");
      setConfirmAdminCancelOpen(false);
      setToast(m(locale, "chat.adminCancelDone"));
      await pull();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function adminExtendBooking() {
    if (!isAdmin || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/bookings/extend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Не удалось продлить время");
      setToast(m(locale, "chat.extend5"));
      await pull();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function adminTimerAction(action: "pause" | "resume") {
    if (!isAdmin || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payment-timer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ action })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Не удалось изменить таймер");
      setToast(action === "pause" ? m(locale, "chat.timerPaused") : m(locale, "chat.resumeTimer"));
      await pull();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionBusy(false);
    }
  }

  async function adminConfirmPaymentFromChat() {
    if (!isAdmin || actionBusy) return;
    setActionBusy(true);
    setToast(null);
    setError(null);
    const prev = uiStatus;
    setUiStatus("Обработка...");
    try {
      const res = await fetch("/api/bookings/confirm-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json?.error || "Не удалось подтвердить оплату");
      setUiStatus("CONFIRMED");
      await pull();
    } catch (e) {
      setUiStatus(prev);
      setToast(e instanceof Error ? e.message : "Не удалось подтвердить оплату");
    } finally {
      setActionBusy(false);
    }
  }

  async function send() {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.set("message", text.trim());
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
          body: JSON.stringify({ message: text.trim() })
        });
      }
      const json = (await res.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
        error?: string;
        chatArchived?: boolean;
        canSend?: boolean;
        booking?: LiveBookingSnap;
      };
      if (!res.ok) throw new Error(messageFromChatResponse(res, json as { error?: string }));
      applyMessagesPayload(json);
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  async function adminDeleteMessage(messageId: number) {
    if (!isAdmin || !confirm("Удалить это сообщение?")) return;
    try {
      const res = await fetch(`/api/admin/chat/messages/${messageId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Не удалось удалить");
      await pull();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  async function adminPurgeRoom() {
    if (!isAdmin || !confirm("Удалить всю переписку и вложения по этой брони?")) return;
    try {
      const res = await fetch(`/api/admin/chat/booking/${bookingId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Не удалось очистить чат");
      await pull();
      setToast("Чат очищен");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function ownerHideChat() {
    if (!isOwner || !confirm("Скрыть переписку у всех? Данные останутся в системе для споров.")) return;
    try {
      const res = await fetch(`/api/chat/booking/${bookingId}/owner-soft-delete`, {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" }
      });
      const json = (await res.json().catch(() => ({}))) as { messages?: ChatMessage[]; error?: string };
      if (!res.ok) throw new Error(messageFromChatResponse(res, json));
      setItems(Array.isArray(json.messages) ? json.messages : []);
      setToast("Переписка скрыта");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Ошибка");
    }
  }

  const canGuestCancel = useMemo(() => {
    if (!isGuest) return false;
    if (effectiveStatus === "CONFIRMED" || effectiveStatus === "CHECKED_IN" || effectiveStatus === "COMPLETED") return false;
    if (effectivePaymentStatus === "PAID") return false;
    return true;
  }, [effectiveStatus, effectivePaymentStatus, isGuest]);

  const canAdminCancel = useMemo(() => {
    if (!isAdmin) return false;
    return !["COMPLETED", "CANCELLED", "CANCELLED_BY_GUEST", "EXPIRED", "CONFIRMED", "CHECKED_IN", "REJECTED"].includes(
      effectiveStatus
    );
  }, [isAdmin, effectiveStatus]);

  const groupedItems = useMemo(() => groupChatMessages(items, locale), [items, locale]);

  async function callAction(opts: { nextStatus: string; url: string; errorPrefix: string }) {
    if (actionBusy) return;
    setActionBusy(true);
    setToast(null);
    setError(null);
    const prev = uiStatus;
    setUiStatus("Обработка...");
    try {
      const res = await fetch(opts.url, { method: "POST", credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json?.error || `${opts.errorPrefix}`);
      setUiStatus(opts.nextStatus);
      await pull();
    } catch (e) {
      setUiStatus(prev);
      setToast(e instanceof Error ? e.message : opts.errorPrefix);
    } finally {
      setActionBusy(false);
    }
  }

  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">
        Некорректный номер брони. Откройте чат из раздела «Мои бронирования».
      </div>
    );
  }

  const headerSubtitle = [hotelName, roomTitle].filter(Boolean).join(" · ") || counterpartPreview || `Бронь #${bookingId}`;
  const statusForPill = uiStatus === "Обработка..." ? bookingStatus : effectiveStatus;

  const inner = (
    <>
      {toast ? (
        <div className="pointer-events-none fixed top-4 left-1/2 z-[110] w-[92%] max-w-md -translate-x-1/2">
          <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.92)] px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur-md">
            {toast}
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          aria-label="Закрыть"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[92vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        </button>
      ) : null}

      {embeddedInRoom ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-slate-950/80 px-3 py-2 backdrop-blur-md">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-200">{title}</div>
            {headerSubtitle ? (
              <div className="truncate text-[10px] text-slate-500">{headerSubtitle}</div>
            ) : null}
            {counterpartTrustBadges.length ? (
              <TrustBadges locale={locale} badges={counterpartTrustBadges} size="sm" className="mt-1.5" />
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusPillClass(statusForPill)}`}
          >
            {statusLabelLocalized(statusForPill, locale)}
          </span>
        </div>
      ) : (
      <header className="sticky top-0 z-20 flex shrink-0 items-start gap-3 border-b border-white/[0.08] bg-slate-950/90 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/75 sm:px-4 sm:py-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-bold ring-1 ring-inset ${roleAccent(currentUserRole === "GUEST" ? "OWNER" : currentUserRole === "OWNER" ? "GUEST" : "ADMIN").avatar}`}>
          {avatarLetter(title)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[14px] font-semibold tracking-tight text-white sm:text-[15px]">{title}</div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset ${statusPillClass(statusForPill)}`}
            >
              {uiStatus === "Обработка..." ? "…" : statusLabelLocalized(statusForPill, locale)}
            </span>
          </div>
          <div className="truncate text-[11px] text-slate-400">{headerSubtitle}</div>
          {counterpartTrustBadges.length ? (
            <TrustBadges locale={locale} badges={counterpartTrustBadges} size="sm" className="mt-1.5" />
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => adminPurgeRoom()}
                className="font-semibold uppercase tracking-wide text-red-300/90 underline-offset-2 hover:underline"
              >
                Очистить чат
              </button>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={() => ownerHideChat()}
                className="font-semibold uppercase tracking-wide text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                Удалить чат
              </button>
            ) : null}
          </div>
          {liveBooking &&
          (effectiveStatus === "WAITING_PAYMENT" ||
            effectiveStatus === "WAIT_PROOF" ||
            effectiveStatus === "ON_REVIEW") ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
              {effectiveStatus === "ON_REVIEW" && liveBooking.proofReviewDeadlineAt ? (
                <span className="tabular-nums text-slate-300">
                  {m(locale, "status.ON_REVIEW")}:{" "}
                  <PaymentCountdown expiresAtIso={liveBooking.proofReviewDeadlineAt} />
                </span>
              ) : liveBooking.expiresAt ? (
                <span className="tabular-nums text-slate-300">
                  {m(locale, "checkout.timerTitle")}:{" "}
                  <PaymentCountdown
                    expiresAtIso={liveBooking.expiresAt}
                    paused={liveBooking.paymentTimerPaused}
                    pausedLabel={m(locale, "chat.timerPaused")}
                  />
                </span>
              ) : liveBooking.paymentTimerPaused ? (
                <span className="text-amber-200/90">{m(locale, "chat.timerPaused")}</span>
              ) : null}
            </div>
          ) : null}
          {isAdmin && (effectiveStatus === "WAITING_PAYMENT" || effectiveStatus === "WAIT_PROOF") ? (
            <div className="mt-1.5 -mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void adminExtendBooking()}
                className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-100"
              >
                {m(locale, "chat.extend5")}
              </button>
              <button
                type="button"
                disabled={actionBusy || liveBooking?.paymentTimerPaused}
                onClick={() => void adminTimerAction("pause")}
                className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-200"
              >
                {m(locale, "chat.pauseTimer")}
              </button>
              <button
                type="button"
                disabled={actionBusy || !liveBooking?.paymentTimerPaused}
                onClick={() => void adminTimerAction("resume")}
                className="shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-100"
              >
                {m(locale, "chat.resumeTimer")}
              </button>
            </div>
          ) : null}
        </div>
        {presentation === "overlay" && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-slate-200 transition hover:bg-white/10"
            aria-label="Закрыть чат"
          >
            ×
          </button>
        ) : null}
      </header>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#050a0e] px-3 py-3 sm:min-h-[280px]"
      >
        {chatArchived ? (
          <div className="mx-auto max-w-md rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100/90 backdrop-blur-md">
            Переписка перенесена в архив (хранение по политике сервиса). Сообщения ниже доступны для просмотра. Отправка недоступна.
          </div>
        ) : null}
        {!canSend && !chatArchived && items.length > 0 ? (
          <div className="mx-auto mb-2 max-w-md rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-[11px] text-slate-400">
            Режим только чтения (бронь завершена, отменена или срок истёк).
          </div>
        ) : null}
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {chatArchived ? "Нет сообщений в архиве." : "Пока сообщений нет. Напишите первым."}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {groupedItems.map((row) => {
              if (row.kind === "date") {
                return (
                  <div key={row.key} className="my-2 flex justify-center">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {row.label}
                    </span>
                  </div>
                );
              }
              const msg = row.msg;
              const mine = msg.senderId === currentUserId;
              const system = msg.senderRole === "SYSTEM";
              if (system) {
                return (
                  <div key={row.key} className="mx-auto my-1.5 max-w-[88%]">
                    <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-center">
                      <p className="text-[11px] leading-snug text-violet-100/90">
                        <span aria-hidden className="mr-1">
                          🛡️
                        </span>
                        {msg.message.replace(/^🛡️\s*/, "")}
                        <span className="ml-2 text-[9px] tabular-nums text-violet-300/55">{timeLabel(msg.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                );
              }
              const accent = roleAccent(msg.senderRole);
              const align = mine ? "justify-end" : "justify-start";
              const tail = mine ? "rounded-br-md" : "rounded-bl-md";
              const bubbleColors = mine
                ? accent.bubble
                : "bg-[#161e2e] text-slate-100 ring-1 ring-white/10";
              const metaColor = mine ? accent.meta : "text-slate-400";
              const hasText = !!msg.message && msg.message !== "📎";
              return (
                <div
                  key={row.key}
                  className={`group flex w-full ${align} ${row.showMeta ? "mt-2.5" : "mt-1"}`}
                >
                  <div className={`flex max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
                    {row.showMeta && !mine ? (
                      <span className={`mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide ${accent.label}`}>
                        {msg.senderName} · {roleShortLabel(msg.senderRole, locale)}
                      </span>
                    ) : null}
                    <div
                      className={`relative min-w-0 rounded-2xl px-3 py-2 text-[13.5px] leading-snug ${tail} ${bubbleColors}`}
                    >
                      {isAdmin && !isSyntheticArchiveChatMessageId(msg.id) ? (
                        <button
                          type="button"
                          title="Скрыть"
                          onClick={() => adminDeleteMessage(msg.id)}
                          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-[11px] font-bold text-white opacity-0 shadow-md transition group-hover:opacity-100"
                        >
                          ×
                        </button>
                      ) : null}
                      {msg.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setLightbox(msg.imageUrl || null)}
                          className={`block overflow-hidden rounded-xl ring-1 ring-white/15 ${hasText ? "mb-1.5" : ""}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.imageUrl} alt="" className="max-h-56 w-full max-w-[260px] object-cover" />
                        </button>
                      ) : null}
                      {hasText ? (
                        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] hyphens-auto">
                          {msg.message}
                        </div>
                      ) : null}
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums ${metaColor}`}>
                        <span>{timeLabel(msg.createdAt)}</span>
                        {mine && msg.readAt ? (
                          <span title={m(locale, "chat.readReceipt")}>✓✓</span>
                        ) : mine ? (
                          <span className="opacity-60" title={m(locale, "chat.you")}>
                            ✓
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div
        className="sticky bottom-0 z-10 shrink-0 space-y-2 border-t border-white/[0.08] bg-[rgba(7,10,14,0.96)] px-3 py-2.5 backdrop-blur-2xl"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {isAdmin && effectiveStatus === "ON_REVIEW" && !suppressReviewActions ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void adminConfirmPaymentFromChat()}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-[0_0_28px_rgba(16,185,129,0.35)] transition hover:brightness-105 disabled:opacity-55"
          >
            {actionBusy ? "…" : m(locale, "chat.confirmPayBig")}
          </button>
        ) : null}

        {(() => {
          const actions: ReactNode[] = [];
          if (isGuest && (effectiveStatus === "WAITING_PAYMENT" || effectiveStatus === "WAIT_PROOF") && paymentCode && !suppressPaymentDeepLink) {
            actions.push(
              <Link
                key="upload-proof"
                href={`/payment/${encodeURIComponent(paymentCode)}?after=1`}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                <span aria-hidden>📄</span> Загрузить чек
              </Link>
            );
          }
          if (isOwner && effectiveStatus === "CONFIRMED") {
            const allowed = !!checkIn && isOnOrAfterLocalDay(new Date(), checkIn);
            actions.push(
              <button
                key="check-in"
                type="button"
                disabled={actionBusy || !allowed}
                onClick={() => {
                  if (!allowed) return;
                  callAction({
                    nextStatus: "CHECKED_IN",
                    url: `/api/owner/bookings/${bookingId}/check-in`,
                    errorPrefix: "Не удалось подтвердить заселение"
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-55"
                title={!allowed ? "В день заезда" : undefined}
              >
                <span aria-hidden>🔑</span> Заселение
              </button>
            );
          }
          if (canGuestCancel) {
            actions.push(
              <button
                key="cancel-guest"
                type="button"
                onClick={() => setConfirmCancelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-500/15"
              >
                Отменить бронь
              </button>
            );
          }
          if (canAdminCancel) {
            actions.push(
              <button
                key="cancel-admin"
                type="button"
                onClick={() => setConfirmAdminCancelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-500/25"
              >
                {m(locale, "chat.adminCancelBooking")}
              </button>
            );
          }
          if (!actions.length) return null;
          return (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {actions}
            </div>
          );
        })()}

        {(() => {
          const chips: { key: string; label: string; tone: "guest" | "owner" | "admin" }[] = [];
          if (isGuest && canSend && (effectiveStatus === "WAITING_PAYMENT" || effectiveStatus === "WAIT_PROOF")) {
            chips.push(
              { key: "g-paid", label: m(locale, "chat.quickPaidBtn"), tone: "guest" },
              { key: "g-receipt", label: m(locale, "chat.quickUploadReceipt"), tone: "guest" },
              { key: "g-almost", label: m(locale, "chat.quickAlmostThere"), tone: "guest" }
            );
          }
          if (isOwner && canSend && !chatArchived) {
            HOST_QUICK_KEYS.forEach((k) => chips.push({ key: `o-${k}`, label: m(locale, `chat.quickReply.host.${k}`), tone: "owner" }));
          }
          if (isAdmin && canSend && !chatArchived) {
            ADMIN_QUICK_KEYS.forEach((k) => chips.push({ key: `a-${k}`, label: m(locale, `chat.quickReply.admin.${k}`), tone: "admin" }));
          }
          if (!chips.length) return null;
          const toneClass = (t: "guest" | "owner" | "admin") =>
            t === "guest"
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              : t === "owner"
                ? "border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                : "border-violet-400/25 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20";
          return (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  disabled={sending}
                  title={c.label}
                  onClick={() => void sendQuickReply(c.label)}
                  className={`max-w-[240px] shrink-0 truncate rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${toneClass(c.tone)}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          );
        })()}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] text-emerald-100">
            <span className="truncate">📎 {file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="shrink-0 rounded-full px-1.5 text-emerald-200 hover:bg-emerald-500/15"
              aria-label="Убрать файл"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="flex min-h-[48px] items-end gap-1 rounded-3xl border border-white/[0.10] bg-slate-900/85 py-1 pl-1.5 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-emerald-400/40 focus-within:ring-2 focus-within:ring-emerald-400/15">
          <button
            type="button"
            disabled={chatArchived || !canSend}
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            aria-label="Прикрепить изображение"
          >
            📎
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={chatArchived ? "Архив…" : "Сообщение…"}
            disabled={chatArchived || !canSend}
            rows={1}
            className="my-1 max-h-28 min-h-[36px] flex-1 resize-none rounded-2xl bg-transparent px-2 py-1.5 text-[13.5px] leading-snug text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
            maxLength={1500}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send().catch(() => undefined);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              send().catch(() => undefined);
            }}
            disabled={!canSubmit}
            aria-label={m(locale, "chat.you")}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition hover:brightness-110 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50"
          >
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-5 14-3-6-6-1z" />
              </svg>
            )}
          </button>
        </div>
        {error ? <div className="px-1 text-xs text-red-300">{error}</div> : null}
      </div>

      {confirmCancelOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (actionBusy) return;
              setConfirmCancelOpen(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.95)] p-5 backdrop-blur-xl" style={{ borderRadius: 16 }}>
            <div className="text-base font-semibold text-slate-100">Отменить бронирование?</div>
            <div className="mt-2 text-sm text-slate-300">Бронь будет закрыта. Это действие необратимо.</div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setConfirmCancelOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={async () => {
                  await callAction({
                    nextStatus: "CANCELLED_BY_GUEST",
                    url: `/api/bookings/${bookingId}/cancel-by-guest`,
                    errorPrefix: "Не удалось отменить"
                  });
                  try {
                    sessionStorage.setItem("toast:once", JSON.stringify({ message: "Бронирование отменено" }));
                  } catch {
                    /* ignore */
                  }
                  window.location.href = "/";
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {actionBusy ? "…" : "Отменить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAdminCancelOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (actionBusy) return;
              setConfirmAdminCancelOpen(false);
            }}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.95)] p-5 backdrop-blur-xl"
            style={{ borderRadius: 16 }}
          >
            <div className="text-base font-semibold text-slate-100">{m(locale, "chat.adminCancelTitle")}</div>
            <div className="mt-2 text-sm text-slate-300">{m(locale, "chat.adminCancelDesc")}</div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setConfirmAdminCancelOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200"
              >
                {m(locale, "chat.modalBack")}
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void submitAdminCancel()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {actionBusy ? "…" : m(locale, "chat.adminCancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (presentation === "overlay") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          aria-label="Закрыть чат"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
        />
        <div
          className="relative z-[1] flex h-[100dvh] w-full flex-col overflow-hidden bg-[rgba(7,10,14,0.97)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] sm:h-[min(820px,calc(100dvh-2rem))] sm:max-w-[640px] sm:rounded-3xl sm:border sm:border-white/10 sm:ring-1 sm:ring-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          {inner}
        </div>
      </div>
    );
  }

  const shellClass = embeddedInRoom
    ? "flex h-full min-h-0 flex-col overflow-hidden"
    : density === "compact"
      ? "flex h-[min(60dvh,560px)] min-h-[320px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.6)] shadow-2xl backdrop-blur-xl"
      : "flex h-[min(720px,calc(100vh-8rem))] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.6)] shadow-2xl backdrop-blur-xl";

  return <div className={shellClass}>{inner}</div>;
}

type LauncherProps = Omit<BookingChatPanelProps, "presentation" | "onClose"> & { openLabel?: string; defaultOpen?: boolean };

export function BookingChatLauncher(props: LauncherProps) {
  const { openLabel = "Открыть чат", defaultOpen, ...rest } = props;
  const [open, setOpen] = useState(Boolean(defaultOpen));

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.18)] backdrop-blur-md transition hover:bg-emerald-500/25"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {openLabel}
      </button>
      {open ? <BookingChatPanel {...rest} presentation="overlay" onClose={() => setOpen(false)} /> : null}
    </>
  );
}

