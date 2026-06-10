import type { ReactNode } from "react";
import Link from "next/link";
import { CancelBookingButton } from "@/components/trips/CancelBookingButton";
import { DownloadReceiptButton } from "@/components/trips/DownloadReceiptButton";

export type BookingActionSlice = {
  id: number;
  status: string;
  publicCode: string | null;
  hasReview?: boolean;
  cancellationReason?: string | null;
};

export function BookingActions({ booking }: { booking: BookingActionSlice }) {
  const actions: ReactNode[] = [];
  const paymentCode = booking.publicCode;

  if (booking.status === "WAITING_PAYMENT" || booking.status === "WAIT_PROOF") {
    if (paymentCode) {
      actions.push(
        <Link key="pay" href={`/payment/${paymentCode}`} className="btn-primary text-sm !w-auto !px-3 !py-1.5">
          💳 Оплатить
        </Link>
      );
    }
    actions.push(<CancelBookingButton key="cancel" bookingId={booking.id} />);
  }

  if (booking.status === "ON_REVIEW") {
    actions.push(
      <Link key="chat" href={`/chat/booking/${booking.id}`} className="btn-secondary text-sm !w-auto !px-3 !py-1.5">
        💬 Написать хосту
      </Link>
    );
    actions.push(<CancelBookingButton key="cancel" bookingId={booking.id} />);
  }

  if (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") {
    actions.push(
      <Link key="chat" href={`/chat/booking/${booking.id}`} className="btn-secondary text-sm !w-auto !px-3 !py-1.5">
        💬 Чат с хостом
      </Link>
    );
    actions.push(<DownloadReceiptButton key="receipt" bookingId={booking.id} />);
  }

  if (booking.status === "COMPLETED") {
    if (!booking.hasReview) {
      actions.push(
        <Link
          key="review"
          href={`/review/create?bookingId=${booking.id}`}
          className="btn-primary text-sm !w-auto !px-3 !py-1.5 !bg-amber-500 !border-amber-400/40"
        >
          ⭐ Написать отзыв
        </Link>
      );
    }
    actions.push(<DownloadReceiptButton key="receipt" bookingId={booking.id} />);
  }

  if (["CANCELLED", "CANCELLED_BY_GUEST", "REJECTED", "EXPIRED"].includes(booking.status)) {
    actions.push(
      <Link key="search" href="/search" className="btn-secondary text-sm !w-auto !px-3 !py-1.5">
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

  return <div className="booking-actions flex flex-wrap items-center gap-2 pt-2">{actions}</div>;
}
