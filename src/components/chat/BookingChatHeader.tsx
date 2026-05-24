"use client";

import { BRAND } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export type BookingChatHeaderProps = {
  locale: Locale;
  hotelName: string;
  roomTitle: string;
  coverImageUrl: string | null;
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  totalPrice: number;
  currency: string;
  bookingStatus: string;
  paymentStatus: string;
  publicCode?: string | null;
  sticky?: boolean;
  compact?: boolean;
};

function statusPillClass(status: string): string {
  if (status === "CONFIRMED" || status === "CHECKED_IN" || status === "COMPLETED") return "chat-pill chat-pill--ok";
  if (status === "ON_REVIEW") return "chat-pill chat-pill--review";
  if (status === "WAITING_PAYMENT" || status === "WAIT_PROOF" || status === "PENDING_OWNER") return "chat-pill chat-pill--wait";
  if (status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED") return "chat-pill chat-pill--bad";
  return "chat-pill";
}

function paymentPillClass(paymentStatus: string): string {
  if (paymentStatus === "PAID") return "chat-pill chat-pill--ok";
  if (paymentStatus === "FAILED" || paymentStatus === "REFUNDED") return "chat-pill chat-pill--bad";
  return "chat-pill chat-pill--wait";
}

export function BookingChatHeader({
  locale,
  hotelName,
  roomTitle,
  coverImageUrl,
  checkInIso,
  checkOutIso,
  guestCount,
  totalPrice,
  currency,
  bookingStatus,
  paymentStatus,
  publicCode,
  compact = true
}: BookingChatHeaderProps) {
  const checkIn = checkInIso.slice(0, 10);
  const checkOut = checkOutIso.slice(0, 10);
  const cover = coverImageUrl || BRAND.logoMark;
  const statusLabel =
    m(locale, `status.${bookingStatus}`) !== `status.${bookingStatus}` ? m(locale, `status.${bookingStatus}`) : bookingStatus;

  return (
    <section className={`chat-header ${compact ? "chat-header--compact" : ""}`}>
      <div className="chat-header__row">
        <div className={`chat-header__thumb ${compact ? "" : "h-16 w-16"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="chat-header__title truncate">{hotelName}</h1>
          <p className="chat-header__sub truncate">{roomTitle}</p>
          <div className="chat-header__meta">
            <span>
              {checkIn} — {checkOut}
            </span>
            <span aria-hidden>·</span>
            <span>
              {guestCount} {m(locale, "bookingRoom.header.guests").toLowerCase()}
            </span>
            {publicCode ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{publicCode}</span>
              </>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={statusPillClass(bookingStatus)}>{statusLabel}</span>
            <span className={paymentPillClass(paymentStatus)}>
              {m(locale, `status.${paymentStatus}`) !== `status.${paymentStatus}` ? m(locale, `status.${paymentStatus}`) : paymentStatus}
            </span>
            <span className="chat-header__price ml-auto sm:ml-0">
              {Number(totalPrice)} {currency}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
