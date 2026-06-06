"use client";

import { addDays, addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";

type Props = {
  disabledDates: Set<string>;
  checkIn?: string;
  checkOut?: string;
  onSelectDate?: (iso: string) => void;
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateAvailabilityCalendar({ disabledDates, checkIn, checkOut, onSelectDate }: Props) {
  const [cursor, setCursor] = useState(() => {
    const seed = checkIn || toIso(new Date());
    return new Date(`${seed}T00:00:00.000Z`);
  });

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = addDays(monthStart, (monthStart.getUTCDay() + 6) % 7 === 0 ? -6 : -((monthStart.getUTCDay() + 6) % 7));
    const gridEnd = addDays(monthEnd, (7 - ((monthEnd.getUTCDay() + 6) % 7) - 1) % 7);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const inRange = (iso: string) => {
    if (!checkIn || !checkOut) return false;
    return iso >= checkIn && iso < checkOut;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
          onClick={() => setCursor(addMonths(cursor, -1))}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <div className="text-sm font-semibold capitalize text-slate-100">
          {format(cursor, "LLLL yyyy", { locale: ru })}
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
          onClick={() => setCursor(addMonths(cursor, 1))}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = toIso(day);
          const disabled = disabledDates.has(iso);
          const muted = !isSameMonth(day, cursor);
          const selected = iso === checkIn || iso === checkOut;
          const ranged = inRange(iso);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled || !onSelectDate}
              onClick={() => onSelectDate?.(iso)}
              className={[
                "relative h-9 rounded-lg text-xs tabular-nums transition",
                muted ? "text-slate-600" : "text-slate-200",
                disabled
                  ? "cursor-not-allowed bg-slate-700/40 text-slate-500 line-through decoration-red-400/80"
                  : "hover:bg-emerald-500/15",
                selected ? "bg-emerald-500/30 font-semibold text-white ring-1 ring-emerald-300/50" : "",
                ranged && !selected ? "bg-emerald-500/10" : ""
              ].join(" ")}
              aria-label={disabled ? `${iso}, занято` : iso}
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-700/50 line-through decoration-red-400" />
          Занято
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-500/25 ring-1 ring-emerald-300/40" />
          Выбрано
        </span>
      </div>
    </div>
  );
}
