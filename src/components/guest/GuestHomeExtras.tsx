"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { cn } from "@/lib/cn";

const RECENT_KEY = "tajstay.recentHotels";

type RecentHotel = { id: number; name: string; city: string };

export function GuestHomeExtras({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const [recent, setRecent] = useState<RecentHotel[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentHotel[];
      if (Array.isArray(parsed)) setRecent(parsed.slice(0, 6));
    } catch {
      /* ignore */
    }
  }, []);

  if (!recent.length) return null;

  return (
    <section className={cn(compact ? "search-moved-block" : "home-section home-section--compact home-chapter")} data-reveal={!compact ? true : undefined}>
      <div className="mx-auto w-full max-w-[var(--taj-page-max)] px-[var(--taj-page-px)]">
      <h2 className="text-sm font-semibold text-[var(--taj-color-text-secondary)]">{m(locale, "home.recentTitle")}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {recent.map((h) => (
          <li key={h.id}>
            <Link
              href={`/hotel/${h.id}`}
              className="inline-flex min-h-[2.75rem] items-center rounded-full border border-[var(--taj-color-border)] bg-[var(--taj-public-surface)] px-3 py-2 text-sm text-[var(--taj-color-text)] transition hover:border-emerald-400/40"
            >
              {h.name}
              <span className="ml-1 text-slate-400">· {h.city}</span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

export function trackRecentHotel(hotel: RecentHotel) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const prev = raw ? (JSON.parse(raw) as RecentHotel[]) : [];
    const list = [hotel, ...(Array.isArray(prev) ? prev.filter((x) => x.id !== hotel.id) : [])].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
