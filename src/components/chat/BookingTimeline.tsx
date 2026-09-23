"use client";

import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { intlLocale } from "@/lib/i18n/format";
import type { BookingTimelineEvent } from "@/lib/chat/bookingTimeline";

const DOT: Record<string, string> = {
  BOOKING_CREATED: "bg-slate-400",
  PAYMENT_PENDING: "bg-amber-400",
  PROOF_SUBMITTED: "bg-sky-400",
  ON_REVIEW: "bg-indigo-400",
  CONFIRMED: "bg-[#0f7a4d]",
  REJECTED: "bg-red-400",
  CHECKED_IN: "bg-[#0f7a4d]",
  COMPLETED: "bg-slate-500",
  CANCELLED: "bg-red-400",
  EXPIRED: "bg-red-400",
  SYSTEM: "bg-violet-400"
};

export function BookingTimeline({
  locale,
  events,
  highlightKind
}: {
  locale: Locale;
  events: BookingTimelineEvent[];
  highlightKind?: string;
}) {
  if (!events.length) return null;

  return (
    <section className="chat-side-card">
      <h2 className="text-sm font-semibold text-[var(--taj-color-text)]">{m(locale, "bookingRoom.timeline.title")}</h2>
      <ol className="mt-3 space-y-3 border-l border-[var(--taj-color-border)] pl-4">
        {events.map((ev) => {
          const active = highlightKind && ev.kind === highlightKind;
          return (
          <li key={ev.id} className={`relative ${active ? "rounded-lg bg-indigo-500/10 -ml-2 pl-2 pr-1 py-1" : ""}`}>
            <span
              className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--taj-color-bg-card-solid)] ${DOT[ev.kind] ?? "bg-slate-500"} ${active ? "scale-125 ring-indigo-300/40" : ""}`}
            />
            <div className="text-xs font-medium text-[var(--taj-color-text)]">
              {ev.kind === "SYSTEM" && ev.detail ? ev.detail : m(locale, ev.labelKey)}
            </div>
            <div className="text-[10px] text-[var(--taj-color-text-muted)]">
              {/* Explicit locale + platform business zone: `toLocaleString(undefined)` used the
                  runtime default, so server (Node, UTC on Vercel) and browser rendered different
                  text — a hydration error that forced the whole booking room to client-render. */}
              {new Intl.DateTimeFormat(intlLocale(locale), {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Dushanbe"
              }).format(new Date(ev.at))}
            </div>
          </li>
        );
        })}
      </ol>
    </section>
  );
}

