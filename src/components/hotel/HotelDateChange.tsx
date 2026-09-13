"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function HotelDateChange({
  locale,
  hotelId,
  checkIn,
  checkOut
}: {
  locale: Locale;
  hotelId: number;
  checkIn?: string;
  checkOut?: string;
}) {
  const router = useRouter();
  const [nextCheckIn, setNextCheckIn] = useState(checkIn ?? "");
  const [nextCheckOut, setNextCheckOut] = useState(checkOut ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nextCheckIn || !nextCheckOut) return;
    const params = new URLSearchParams({ checkIn: nextCheckIn, checkOut: nextCheckOut });
    router.push(`/hotel/${hotelId}?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col text-xs text-[var(--taj-color-text-secondary)]">
        {m(locale, "search.checkIn")}
        <input
          type="date"
          value={nextCheckIn}
          onChange={(e) => setNextCheckIn(e.target.value)}
          className="mt-1 rounded-lg border border-brand-700 bg-black/20 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="flex flex-col text-xs text-[var(--taj-color-text-secondary)]">
        {m(locale, "search.checkOut")}
        <input
          type="date"
          value={nextCheckOut}
          onChange={(e) => setNextCheckOut(e.target.value)}
          min={nextCheckIn || undefined}
          className="mt-1 rounded-lg border border-brand-700 bg-black/20 px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
      >
        {m(locale, "hotelPage.changeDates")}
      </button>
    </form>
  );
}
