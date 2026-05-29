"use client";

import Link from "next/link";

type Props = {
  priceLabel: string;
  price: number;
  bookLabel: string;
  bookHref: string;
};

export function HotelStickyBookBar({ priceLabel, price, bookLabel, bookHref }: Props) {
  return (
    <div className="hotel-sticky-bar md:hidden">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{priceLabel}</p>
        <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
          {price} <span className="text-sm font-semibold">TJS</span>
        </p>
      </div>
      <Link
        href={bookHref}
        className="btn-primary !w-auto shrink-0 !px-6 !h-12 !text-sm"
        onClick={() => {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
        }}
      >
        {bookLabel}
      </Link>
    </div>
  );
}
