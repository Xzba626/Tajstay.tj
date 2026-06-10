"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CancelBookingButton } from "./CancelBookingButton";
import { DownloadReceiptButton } from "./DownloadReceiptButton";
import { guestBookingCancelAllowed } from "@/lib/booking/guestCancel";

type BookingActionsProps = {
  booking: {
    id: number;
    status: string;
    paymentStatus: string;
    publicCode: string | null;
    cancellationReason?: string | null;
    review?: { id: number } | null;
  };
};

export function BookingActions({ booking }: BookingActionsProps) {
  const actions: ReactNode[] = [];
  const canCancel = guestBookingCancelAllowed({
    status: booking.status,
    paymentStatus: booking.paymentStatus
  });
  const paymentCode = booking.publicCode?.trim();

  if (booking.status === "WAITING_PAYMENT" && paymentCode) {
    actions.push(
      <Link key="pay" href={`/payment/${paymentCode}`} className="mockup-btn mockup-btn--primary">
        💳 Оплатить
      </Link>
    );
    if (canCancel) {
      actions.push(<CancelBookingButton key="cancel" bookingId={booking.id} />);
    }
  }

  if (booking.status === "ON_REVIEW") {
    actions.push(
      <Link key="chat" href={`/chat/booking/${booking.id}`} className="mockup-btn mockup-btn--secondary">
        💬 Написать хосту
      </Link>
    );
    if (canCancel) {
      actions.push(<CancelBookingButton key="cancel" bookingId={booking.id} />);
    }
  }

  if (booking.status === "WAIT_PROOF" || booking.status === "PENDING_OWNER") {
    if (paymentCode) {
      actions.push(
        <Link key="pay" href={`/payment/${paymentCode}`} className="mockup-btn mockup-btn--secondary">
          💳 Страница оплаты
        </Link>
      );
    }
    actions.push(
      <Link key="chat" href={`/chat/booking/${booking.id}`} className="mockup-btn mockup-btn--secondary">
        💬 Чат
      </Link>
    );
    if (canCancel) {
      actions.push(<CancelBookingButton key="cancel" bookingId={booking.id} />);
    }
  }

  if (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") {
    actions.push(
      <Link key="chat" href={`/chat/booking/${booking.id}`} className="mockup-btn mockup-btn--secondary">
        💬 Чат с хостом
      </Link>
    );
    actions.push(<DownloadReceiptButton key="receipt" bookingId={booking.id} />);
  }

  if (booking.status === "COMPLETED") {
    if (!booking.review) {
      actions.push(
        <Link key="review" href={`/review/create?bookingId=${booking.id}`} className="mockup-btn mockup-btn--accent">
          ⭐ Написать отзыв
        </Link>
      );
    }
    actions.push(<DownloadReceiptButton key="receipt" bookingId={booking.id} />);
  }

  if (["CANCELLED", "CANCELLED_BY_GUEST", "REJECTED", "EXPIRED"].includes(booking.status)) {
    actions.push(
      <Link key="search" href="/search" className="mockup-btn mockup-btn--secondary">
        🔍 Найти другой вариант
      </Link>
    );
    if (booking.cancellationReason) {
      actions.push(
        <span key="reason" className="text-sm text-[var(--text-muted)]">
          Причина: {booking.cancellationReason}
        </span>
      );
    }
  }

  if (!actions.length) return null;

  return <div className="booking-actions mt-3 flex flex-wrap items-center gap-2">{actions}</div>;
}
