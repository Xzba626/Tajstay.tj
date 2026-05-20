"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

const RECENT_KEY = "tajstay.recentHotels";

type RecentHotel = { id: number; name: string; city: string };

export function GuestHomeExtras({ locale }: { locale: Locale }) {
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
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" data-reveal>
      <h2 className="text-lg font-semibold text-slate-900">{m(locale, "home.recentTitle")}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {recent.map((h) => (
          <li key={h.id}>
            <Link
              href={`/hotel/${h.id}`}
              className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-emerald-400"
            >
              {h.name}
              <span className="ml-1 text-slate-400">· {h.city}</span>
            </Link>
          </li>
        ))}
      </ul>
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
