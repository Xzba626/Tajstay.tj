"use client";

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
      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-slate-950/90 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/75">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 text-lg font-bold text-emerald-100 ring-1 ring-white/10">
          {avatarLetter(title)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-tight text-white">{title}</div>
          <div className="truncate text-xs text-slate-400">{headerSubtitle}</div>
          {counterpartTrustBadges.length ? (
            <TrustBadges locale={locale} badges={counterpartTrustBadges} size="sm" className="mt-1.5" />
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${statusPillClass(statusForPill)}`}
            >
              {uiStatus === "Обработка..." ? "…" : statusLabelLocalized(statusForPill, locale)}
            </span>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => adminPurgeRoom()}
                className="text-[10px] font-semibold uppercase tracking-wide text-red-300/90 underline-offset-2 hover:underline"
              >
                Очистить чат
              </button>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={() => ownerHideChat()}
                className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                Удалить чат
              </button>
            ) : null}
          </div>
          {liveBooking &&
          (effectiveStatus === "WAITING_PAYMENT" ||
            effectiveStatus === "WAIT_PROOF" ||
            effectiveStatus === "ON_REVIEW") ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
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
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void adminExtendBooking()}
                className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-100"
              >
                {m(locale, "chat.extend5")}
              </button>
              <button
                type="button"
                disabled={actionBusy || liveBooking?.paymentTimerPaused}
                onClick={() => void adminTimerAction("pause")}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-200"
              >
                {m(locale, "chat.pauseTimer")}
              </button>
              <button
                type="button"
                disabled={actionBusy || !liveBooking?.paymentTimerPaused}
                onClick={() => void adminTimerAction("resume")}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-100"
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10"
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
              const fromGuest = msg.senderRole === "GUEST";
              if (system) {
                return (
                  <div key={row.key} className="mx-auto my-1 max-w-[92%]">
                    <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-center">
                      <p className="text-[11px] leading-snug text-violet-100/90">
                        <span aria-hidden className="mr-1">
                          🛡️
                        </span>
                        {msg.message.replace(/^🛡️\s*/, "")}
                      </p>
                      <p className="mt-1 text-[9px] text-violet-300/50">{timeLabel(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={row.key}
                  className={`group flex w-full ${fromGuest ? "justify-end" : "justify-start"} ${row.showMeta ? "mt-2" : "mt-0.5"}`}
                >
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
                      fromGuest
                        ? "rounded-br-md bg-emerald-600 text-white"
                        : "rounded-bl-md bg-slate-800 text-slate-100 ring-1 ring-white/10"
                    }`}
                  >
                    {isAdmin && !isSyntheticArchiveChatMessageId(msg.id) ? (
                      <button
                        type="button"
                        title="Скрыть"
                        onClick={() => adminDeleteMessage(msg.id)}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                      >
                        ×
                      </button>
                    ) : null}
                    {row.showMeta ? (
                      <div
                        className={`mb-1 flex items-center justify-between gap-2 text-[10px] ${fromGuest ? "text-emerald-100/90" : "text-slate-400"}`}
                      >
                        <span className="font-medium">{mine ? m(locale, "chat.you") : msg.senderName}</span>
                        <span>
                          {timeLabel(msg.createdAt)}
                          {mine && msg.readAt ? (
                            <span className="ml-1 text-emerald-200/70" title={m(locale, "chat.readReceipt")}>
                              ✓✓
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ) : (
                      <div className={`text-right text-[9px] ${fromGuest ? "text-emerald-100/60" : "text-slate-500"}`}>
                        {timeLabel(msg.createdAt)}
                        {mine && msg.readAt ? (
                          <span className="ml-1 text-emerald-200/70" title={m(locale, "chat.readReceipt")}>
                            ✓✓
                          </span>
                        ) : null}
                      </div>
                    )}
                    {msg.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(msg.imageUrl || null)}
                        className="mt-1 block overflow-hidden rounded-xl ring-1 ring-white/15"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.imageUrl} alt="" className="max-h-40 w-full object-cover" />
                      </button>
                    ) : null}
                    {msg.message && msg.message !== "📎" ? (
                      <div className={`whitespace-pre-wrap break-words ${row.showMeta ? "pt-1" : ""}`}>{msg.message}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div
        className="sticky bottom-0 z-10 shrink-0 space-y-2 border-t border-white/[0.08] bg-[rgba(7,10,14,0.96)] px-3 py-3 backdrop-blur-2xl"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {isAdmin && effectiveStatus === "ON_REVIEW" && !suppressReviewActions ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void adminConfirmPaymentFromChat()}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-base font-bold text-white shadow-[0_0_28px_rgba(16,185,129,0.35)] transition hover:brightness-105 disabled:opacity-55"
          >
            {actionBusy ? "…" : m(locale, "chat.confirmPayBig")}
          </button>
        ) : null}

        <div
          className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-2.5 backdrop-blur-md"
          style={{ borderRadius: 16 }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Действия</div>
            <div className="text-[10px] text-slate-500">{currentUserRole}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isGuest && (effectiveStatus === "WAITING_PAYMENT" || effectiveStatus === "WAIT_PROOF") ? (
              paymentCode && !suppressPaymentDeepLink ? (
                <Link
                  href={`/payment/${encodeURIComponent(paymentCode)}?after=1`}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-white/10"
                >
                  Загрузить чек
                </Link>
              ) : null
            ) : null}
            {isOwner && effectiveStatus === "CONFIRMED" ? (
              (() => {
                const allowed = !!checkIn && isOnOrAfterLocalDay(new Date(), checkIn);
                return (
                  <button
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
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    title={!allowed ? "В день заезда" : undefined}
                  >
                    Заселение
                  </button>
                );
              })()
            ) : null}
            {canGuestCancel ? (
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(true)}
                className="rounded-xl border border-red-400/35 px-3 py-2 text-xs font-semibold text-red-200"
              >
                Отменить бронь
              </button>
            ) : null}
            {canAdminCancel ? (
              <button
                type="button"
                onClick={() => setConfirmAdminCancelOpen(true)}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
              >
                {m(locale, "chat.adminCancelBooking")}
              </button>
            ) : null}
          </div>
        </div>

        {isGuest && canSend && (effectiveStatus === "WAITING_PAYMENT" || effectiveStatus === "WAIT_PROOF") ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => void sendQuickReply(m(locale, "chat.quickPaidBtn"))}
              className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 disabled:opacity-50"
            >
              {m(locale, "chat.quickPaidBtn")}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void sendQuickReply(m(locale, "chat.quickUploadReceipt"))}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 disabled:opacity-50"
            >
              {m(locale, "chat.quickUploadReceipt")}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void sendQuickReply(m(locale, "chat.quickAlmostThere"))}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 disabled:opacity-50"
            >
              {m(locale, "chat.quickAlmostThere")}
            </button>
          </div>
        ) : null}

        {isOwner && canSend && !chatArchived ? (
          <div className="flex flex-wrap gap-2">
            {HOST_QUICK_KEYS.map((k) => {
              const label = m(locale, `chat.quickReply.host.${k}`);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={sending}
                  title={label}
                  onClick={() => void sendQuickReply(label)}
                  className="max-w-[220px] truncate rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 disabled:opacity-50"
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {isAdmin && canSend && !chatArchived ? (
          <div className="flex flex-wrap gap-2">
            {ADMIN_QUICK_KEYS.map((k) => {
              const label = m(locale, `chat.quickReply.admin.${k}`);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={sending}
                  title={label}
                  onClick={() => void sendQuickReply(label)}
                  className="max-w-[220px] truncate rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-[11px] font-semibold text-indigo-100 disabled:opacity-50"
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? <div className="truncate text-[11px] text-emerald-200/90">{file.name}</div> : null}
        <div className="flex min-h-[52px] items-end gap-1 rounded-full border border-white/12 bg-slate-900/95 py-1.5 pl-2 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <button
            type="button"
            disabled={chatArchived || !canSend}
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
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
            className="mb-1 max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl bg-transparent px-2 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
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
            className="mb-0.5 shrink-0 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] disabled:opacity-45"
          >
            {sending ? "…" : "Отпр."}
          </button>
        </div>
        {error ? <div className="text-xs text-red-300">{error}</div> : null}
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

  const shellClass =
    presentation === "overlay"
      ? "fixed inset-0 z-[100] flex flex-col bg-[rgba(7,10,14,0.92)] backdrop-blur-xl sm:inset-4 sm:rounded-2xl sm:border sm:border-white/10"
      : embeddedInRoom
        ? "flex h-full min-h-0 flex-col overflow-hidden"
        : density === "compact"
          ? "flex h-[min(52dvh,520px)] min-h-[260px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.55)] shadow-2xl backdrop-blur-xl"
          : "flex h-[min(720px,calc(100vh-8rem))] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.55)] shadow-2xl backdrop-blur-xl";

  return <div className={shellClass}>{inner}</div>;
}

type LauncherProps = Omit<BookingChatPanelProps, "presentation" | "onClose"> & { openLabel?: string; defaultOpen?: boolean };

export function BookingChatLauncher(props: LauncherProps) {
  const { openLabel = "Открыть чат", defaultOpen, ...rest } = props;
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)] backdrop-blur-md transition hover:bg-emerald-500/25"
        style={{ borderRadius: 16 }}
      >
        <span className="text-base" aria-hidden>
          💬
        </span>
        {openLabel}
      </button>
      {open ? <BookingChatPanel {...rest} presentation="overlay" onClose={() => setOpen(false)} /> : null}
    </>
  );
}

