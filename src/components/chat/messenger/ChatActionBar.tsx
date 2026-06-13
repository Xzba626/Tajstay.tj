"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ChatDisputeSheet } from "@/components/chat/ChatDisputeSheet";
import type { ChatParticipantRole } from "@/components/chat/BookingRoom.types";

type Props = {
  locale: Locale;
  bookingId: number;
  bookingStatus: string;
  paymentStatus: string;
  paymentCode?: string;
  currentUserRole: ChatParticipantRole;
  checkOutIso?: string;
  canGuestCancel: boolean;
  onGuestCancel: () => void;
  onCheckoutConfirm: () => void;
  onDisputeOpened?: () => void;
  onAdminConfirmPayment?: () => void;
  suppressPaymentLink?: boolean;
  actionBusy?: boolean;
};

function isOnOrAfterCheckOutDay(checkOutIso?: string): boolean {
  if (!checkOutIso) return false;
  const checkOut = new Date(checkOutIso);
  if (Number.isNaN(checkOut.getTime())) return false;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cout = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  return start.getTime() >= cout.getTime();
}

export function ChatActionBar({
  locale,
  bookingId,
  bookingStatus,
  paymentStatus,
  paymentCode,
  currentUserRole,
  checkOutIso,
  canGuestCancel,
  onGuestCancel,
  onCheckoutConfirm,
  onDisputeOpened,
  onAdminConfirmPayment,
  suppressPaymentLink,
  actionBusy
}: Props) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const isGuest = currentUserRole === "GUEST";
  const isAdmin = currentUserRole === "ADMIN";

  const showPayment =
    isGuest &&
    !suppressPaymentLink &&
    paymentCode &&
    (bookingStatus === "WAITING_PAYMENT" || bookingStatus === "WAIT_PROOF");

  const showDispute = currentUserRole === "GUEST";

  const showCheckout =
    isGuest &&
    (bookingStatus === "CONFIRMED" || bookingStatus === "CHECKED_IN") &&
    paymentStatus === "PAID" &&
    isOnOrAfterCheckOutDay(checkOutIso);

  const showCancel = isGuest && canGuestCancel;
  const showAdminConfirm = isAdmin && bookingStatus === "ON_REVIEW" && onAdminConfirmPayment;

  if (!showPayment && !showDispute && !showCheckout && !showCancel && !showAdminConfirm) return null;

  return (
    <>
      <div className="messenger-actionbar" role="group" aria-label={m(locale, "chat.actionsGroup")}>
        {showPayment ? (
          <Link href={`/payment/${encodeURIComponent(paymentCode!)}?after=1`} className="messenger-actionbar__chip messenger-actionbar__chip--pay">
            <span aria-hidden>💳</span>
            <span>{m(locale, "chat.actionPay")}</span>
          </Link>
        ) : null}
        {showDispute ? (
          <button
            type="button"
            className="messenger-actionbar__chip messenger-actionbar__chip--dispute"
            onClick={() => setDisputeOpen(true)}
          >
            <span aria-hidden>⚠️</span>
            <span>{m(locale, "chat.dispute.open")}</span>
          </button>
        ) : null}
        {showCheckout ? (
          <button
            type="button"
            className="messenger-actionbar__chip messenger-actionbar__chip--checkout"
            onClick={() => setCheckoutOpen(true)}
          >
            <span aria-hidden>✅</span>
            <span>{m(locale, "chat.actionCheckout")}</span>
          </button>
        ) : null}
        {showAdminConfirm ? (
          <button
            type="button"
            disabled={actionBusy}
            className="messenger-actionbar__chip messenger-actionbar__chip--checkout"
            onClick={onAdminConfirmPayment}
          >
            <span aria-hidden>✅</span>
            <span>{m(locale, "chat.confirmPayBig")}</span>
          </button>
        ) : null}
        {showCancel ? (
          <button
            type="button"
            className="messenger-actionbar__chip messenger-actionbar__chip--cancel"
            onClick={onGuestCancel}
          >
            <span aria-hidden>❌</span>
            <span>{m(locale, "chat.cancelBooking")}</span>
          </button>
        ) : null}
      </div>

      <ChatDisputeSheet
        locale={locale}
        bookingId={bookingId}
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        onOpened={onDisputeOpened}
      />

      {checkoutOpen ? (
        <div className="messenger-modal">
          <button
            type="button"
            className="messenger-modal__overlay"
            aria-label={m(locale, "common.close")}
            onClick={() => !actionBusy && setCheckoutOpen(false)}
          />
          <div className="messenger-modal__panel" role="dialog" aria-modal="true">
            <div className="messenger-modal__title">{m(locale, "chat.actionCheckout")}</div>
            <p className="messenger-modal__text">{m(locale, "chat.checkoutConfirmBody")}</p>
            <div className="messenger-modal__actions">
              <button type="button" className="messenger-modal__btn" disabled={actionBusy} onClick={() => setCheckoutOpen(false)}>
                {m(locale, "chat.modalBack")}
              </button>
              <button
                type="button"
                className="messenger-modal__btn messenger-modal__btn--primary"
                disabled={actionBusy}
                onClick={() => {
                  setCheckoutOpen(false);
                  onCheckoutConfirm();
                }}
              >
                {actionBusy ? "…" : m(locale, "chat.checkoutConfirmYes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
