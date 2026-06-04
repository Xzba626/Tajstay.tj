"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard, LogOut } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ChatDisputeSheet } from "@/components/chat/ChatDisputeSheet";

type Props = {
  locale: Locale;
  bookingId: number;
  bookingStatus: string;
  paymentStatus: string;
  paymentCode?: string;
  currentUserRole: "GUEST" | "OWNER" | "ADMIN";
  checkOutIso?: string;
  canGuestCancel: boolean;
  onGuestCancel: () => void;
  onCheckoutConfirm?: () => void;
  onDisputeOpened?: () => void;
  suppressPaymentLink?: boolean;
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

export function ChatComposeActions({
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
  suppressPaymentLink
}: Props) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const isGuest = currentUserRole === "GUEST";

  const showPayment =
    isGuest &&
    !suppressPaymentLink &&
    paymentCode &&
    (bookingStatus === "WAITING_PAYMENT" || bookingStatus === "WAIT_PROOF");

  const showDispute = currentUserRole !== "ADMIN";

  const showCheckout =
    isGuest &&
    (bookingStatus === "CONFIRMED" || bookingStatus === "CHECKED_IN") &&
    paymentStatus === "PAID" &&
    isOnOrAfterCheckOutDay(checkOutIso);

  const showCancel = isGuest && canGuestCancel;

  if (!showPayment && !showDispute && !showCheckout && !showCancel) return null;

  return (
    <>
      <div className="chat-compose__actions" role="group" aria-label={m(locale, "chat.actionsGroup")}>
        {showPayment ? (
          <Link href={`/payment/${encodeURIComponent(paymentCode!)}?after=1`} className="chat-compose__action chat-compose__action--pay">
            <CreditCard size={16} aria-hidden />
            <span>{m(locale, "chat.actionPay")}</span>
          </Link>
        ) : null}
        {showDispute ? (
          <button type="button" className="chat-compose__action chat-compose__action--dispute" onClick={() => setDisputeOpen(true)}>
            <AlertTriangle size={16} aria-hidden />
            <span>{m(locale, "chat.dispute.open")}</span>
          </button>
        ) : null}
        {showCheckout ? (
          <button type="button" className="chat-compose__action chat-compose__action--checkout" onClick={onCheckoutConfirm}>
            <LogOut size={16} aria-hidden />
            <span>{m(locale, "chat.actionCheckout")}</span>
          </button>
        ) : null}
        {showCancel ? (
          <button type="button" className="chat-compose__action chat-compose__action--cancel" onClick={onGuestCancel}>
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
    </>
  );
}
