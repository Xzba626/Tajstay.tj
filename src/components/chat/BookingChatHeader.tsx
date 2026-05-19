"use client";

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
};

function statusPillClass(status: string): string {
  if (status === "CONFIRMED" || status === "CHECKED_IN" || status === "COMPLETED") {
    return "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30";
  }
  if (status === "ON_REVIEW") return "bg-indigo-500/20 text-indigo-100 ring-indigo-400/30";
  if (status === "WAITING_PAYMENT" || status === "WAIT_PROOF" || status === "PENDING_OWNER") {
    return "bg-amber-500/20 text-amber-100 ring-amber-400/30";
  }
  if (status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED") {
    return "bg-red-500/20 text-red-100 ring-red-400/30";
  }
  return "bg-white/10 text-slate-200 ring-white/10";
}

function paymentPillClass(paymentStatus: string): string {
  if (paymentStatus === "PAID") return "bg-emerald-500/15 text-emerald-100";
  if (paymentStatus === "FAILED" || paymentStatus === "REFUNDED") return "bg-red-500/15 text-red-100";
  return "bg-slate-500/20 text-slate-200";
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
  publicCode
}: BookingChatHeaderProps) {
  const checkIn = checkInIso.slice(0, 10);
  const checkOut = checkOutIso.slice(0, 10);
  const cover = coverImageUrl || "/logo-mark.svg";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-xl">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white">{hotelName}</h1>
          <p className="truncate text-sm text-slate-400">{roomTitle}</p>
          {publicCode ? (
            <p className="mt-1 text-xs font-mono text-slate-500">{publicCode}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            <span>
              {m(locale, "bookingRoom.header.dates")}: {checkIn} — {checkOut}
            </span>
            <span>·</span>
            <span>
              {m(locale, "bookingRoom.header.guests")}: {guestCount}
            </span>
          </div>
          <div className="mt-2 text-base font-semibold tabular-nums text-white">
            {Number(totalPrice)} {currency}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${statusPillClass(bookingStatus)}`}>
              {m(locale, `status.${bookingStatus}`) !== `status.${bookingStatus}` ? m(locale, `status.${bookingStatus}`) : bookingStatus}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${paymentPillClass(paymentStatus)}`}>
              {m(locale, "bookingRoom.header.payment")}:{" "}
              {m(locale, `status.${paymentStatus}`) !== `status.${paymentStatus}` ? m(locale, `status.${paymentStatus}`) : paymentStatus}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}


