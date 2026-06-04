"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { Switch } from "@/components/ui/Switch";

type RoomOption = { id: number; label: string };

type Props = {
  locale: Locale;
  rooms: RoomOption[];
  action: string;
};

export function CalendarOverrideForm({ locale, rooms, action }: Props) {
  const [blocked, setBlocked] = useState(false);

  return (
    <form action={action} method="post" className="owner-cal-override-form grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
      <select
        name="roomId"
        required
        defaultValue=""
        className="h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
        aria-label={m(locale, "owner.calendar.filterRoom")}
      >
        <option value="" disabled>
          {m(locale, "owner.calendar.selectRoomPlaceholder")}
        </option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <input
        name="date"
        type="date"
        required
        className="h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        aria-label={m(locale, "owner.calendar.selectDatePlaceholder")}
      />
      <label className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-1">
        <span className="font-medium text-slate-700">{m(locale, "owner.block")}</span>
        <Switch checked={blocked} onChange={setBlocked} aria-label={m(locale, "owner.block")} />
        <input type="hidden" name="isBlocked" value={blocked ? "on" : ""} />
      </label>
      <input
        name="customPrice"
        type="number"
        min={0}
        step={1}
        placeholder={m(locale, "owner.priceIfOpen")}
        className="h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-1"
        disabled={blocked}
      />
      <button type="submit" className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white md:col-span-5">
        {m(locale, "owner.saveOverride")}
      </button>
    </form>
  );
}
