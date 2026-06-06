"use client";

import { useCallback, useMemo, useState } from "react";
import type { BookingRoomProps } from "@/components/chat/BookingRoom.types";
import { ChatActionBar } from "@/components/chat/messenger/ChatActionBar";
import { ChatComposeBar } from "@/components/chat/messenger/ChatComposeBar";
import { ChatMessageList } from "@/components/chat/messenger/ChatMessageList";
import { ChatMessengerHeader } from "@/components/chat/messenger/ChatMessengerHeader";
import { useBookingChat } from "@/hooks/useBookingChat";
import { m } from "@/lib/i18n/messages";

export type BookingMessengerProps = BookingRoomProps;

export function BookingMessenger(props: BookingMessengerProps) {
  const {
    locale,
    bookingId,
    currentUserId,
    currentUserRole,
    backHref,
    hotelName,
    roomTitle,
    checkOutIso,
    bookingStatus,
    paymentStatus,
    publicCode
  } = props;

  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const {
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
    onComposeInput
  } = useBookingChat({ bookingId, currentUserId, locale, bookingStatus });

  const effectiveStatus = liveBooking?.status ?? uiStatus;
  const effectivePaymentStatus = liveBooking?.paymentStatus ?? paymentStatus;

  const timerExpiresAt =
    effectiveStatus === "ON_REVIEW"
      ? liveBooking?.proofReviewDeadlineAt ?? null
      : liveBooking?.expiresAt ?? null;

  const isGuest = currentUserRole === "GUEST";
  const isAdmin = currentUserRole === "ADMIN";

  const canGuestCancel = useMemo(() => {
    if (!isGuest) return false;
    if (effectiveStatus === "CONFIRMED" || effectiveStatus === "CHECKED_IN" || effectiveStatus === "COMPLETED")
      return false;
    if (effectivePaymentStatus === "PAID") return false;
    return true;
  }, [effectiveStatus, effectivePaymentStatus, isGuest]);

  const callAction = useCallback(
    async (opts: { nextStatus: string; url: string; errorPrefix: string }) => {
      if (actionBusy) return;
      setActionBusy(true);
      setToast(null);
      setError(null);
      const prev = uiStatus;
      setUiStatus("Обработка...");
      try {
        const res = await fetch(opts.url, { method: "POST", credentials: "include" });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(json?.error || opts.errorPrefix);
        setUiStatus(opts.nextStatus);
        await pull();
      } catch (e) {
        setUiStatus(prev);
        setToast(e instanceof Error ? e.message : opts.errorPrefix);
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, pull, setError, setUiStatus, uiStatus]
  );

  async function handleSend(payload: { text: string; file: File | null }) {
    setSending(true);
    setError(null);
    try {
      await sendMessage(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  async function adminConfirmPaymentFromChat() {
    if (!isAdmin || actionBusy) return;
    setActionBusy(true);
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

  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return (
      <div className="messenger-root messenger-root--error">
        Некорректный номер брони. Откройте чат из раздела «Мои бронирования».
      </div>
    );
  }

  return (
    <div className="messenger-root">
      {toast ? <div className="messenger-toast">{toast}</div> : null}

      {lightbox ? (
        <button type="button" className="messenger-lightbox" onClick={() => setLightbox(null)} aria-label="Закрыть">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" />
        </button>
      ) : null}

      <ChatMessengerHeader
        locale={locale}
        backHref={backHref}
        hotelName={hotelName}
        roomTitle={roomTitle}
        bookingStatus={effectiveStatus}
        timerExpiresAt={timerExpiresAt}
        timerPaused={liveBooking?.paymentTimerPaused}
        timerPausedLabel={m(locale, "chat.timerPaused")}
      />

      <ChatMessageList
        locale={locale}
        items={items}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        chatArchived={chatArchived}
        canSend={canSend}
        typingName={typingName}
        onImageOpen={setLightbox}
        onAdminDelete={isAdmin ? adminDeleteMessage : undefined}
      />

      <ChatActionBar
        locale={locale}
        bookingId={bookingId}
        bookingStatus={effectiveStatus}
        paymentStatus={effectivePaymentStatus}
        paymentCode={publicCode ?? undefined}
        currentUserRole={currentUserRole}
        checkOutIso={checkOutIso}
        canGuestCancel={canGuestCancel}
        onGuestCancel={() => setConfirmCancelOpen(true)}
        onCheckoutConfirm={() => {
          void callAction({
            nextStatus: "COMPLETED",
            url: `/api/bookings/${bookingId}/confirm-checkout`,
            errorPrefix: "Не удалось подтвердить выезд"
          });
        }}
        onDisputeOpened={() => {
          void pull();
        }}
        onAdminConfirmPayment={() => void adminConfirmPaymentFromChat()}
        suppressPaymentLink
        actionBusy={actionBusy}
      />

      <ChatComposeBar
        locale={locale}
        disabled={chatArchived || !canSend}
        sending={sending}
        onSend={handleSend}
        onInput={onComposeInput}
        error={error}
      />

      {confirmCancelOpen ? (
        <div className="messenger-modal">
          <button
            type="button"
            className="messenger-modal__overlay"
            aria-label={m(locale, "common.close")}
            onClick={() => !actionBusy && setConfirmCancelOpen(false)}
          />
          <div className="messenger-modal__panel" role="dialog" aria-modal="true">
            <div className="messenger-modal__title">Отменить бронирование?</div>
            <p className="messenger-modal__text">Бронь будет закрыта. Это действие необратимо.</p>
            <div className="messenger-modal__actions">
              <button type="button" className="messenger-modal__btn" disabled={actionBusy} onClick={() => setConfirmCancelOpen(false)}>
                {m(locale, "chat.modalBack")}
              </button>
              <button
                type="button"
                className="messenger-modal__btn messenger-modal__btn--danger"
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
              >
                {actionBusy ? "…" : "Отменить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
