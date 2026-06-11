"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OfflineBookingPublicView } from "@/lib/pms/offlinePrivacy";

type Props = {
  locale: Locale;
  apiBase?: string;
};

export function OfflineBookingStaffSearch({ locale, apiBase = "/api/owner" }: Props) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OfflineBookingPublicView[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/offline-bookings/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "failed");
      const items = (json.items ?? []).map((b: OfflineBookingPublicView & { checkIn: string; checkOut: string }) => ({
        ...b,
        checkIn: new Date(b.checkIn),
        checkOut: new Date(b.checkOut)
      }));
      setResults(items);
    } catch {
      setError(m(locale, "owner.offline.searchFailed"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="offline-staff-search">
      <h3 className="offline-staff-search__title">{m(locale, "owner.offline.staffSearchTitle")}</h3>
      <p className="offline-staff-search__hint">{m(locale, "owner.offline.staffSearchHint")}</p>

      <form onSubmit={onSearch} className="offline-staff-search__form">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={m(locale, "owner.offline.staffSearchPlaceholder")}
          className="offline-staff-search__input"
          minLength={2}
          required
        />
        <button type="submit" className="offline-staff-search__btn" disabled={loading}>
          {loading ? "…" : m(locale, "search.search")}
        </button>
      </form>

      {error ? <p className="offline-staff-search__error">{error}</p> : null}

      <ul className="offline-staff-search__list">
        {results.map((b) => (
          <li key={b.id} className="offline-staff-search__item">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white">{b.guestName ?? "—"}</span>
              <StatusBadge variant="neutral">{m(locale, "owner.bookingBadge.offline")}</StatusBadge>
              {b.offlineStatus ? (
                <StatusBadge variant="success">{m(locale, `owner.offline.status.${b.offlineStatus}`)}</StatusBadge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-white/60">
              {b.hotelName ?? "—"} · {b.roomTypeName ?? "—"}
              {b.roomLabel ? ` · ${m(locale, "owner.offline.roomNo")} ${b.roomLabel}` : ""}
            </p>
            <p className="text-sm text-white/50">
              {b.checkIn.toISOString().slice(0, 10)} — {b.checkOut.toISOString().slice(0, 10)} · {b.guestCount}{" "}
              {m(locale, "owner.offline.guestsShort")}
            </p>
            <p className="mt-2 text-xs text-amber-200/90">{m(locale, "owner.offline.staffPiiNotice")}</p>
          </li>
        ))}
      </ul>

      {!loading && q.trim().length >= 2 && results.length === 0 && !error ? (
        <p className="text-sm text-white/50">{m(locale, "owner.offline.searchEmpty")}</p>
      ) : null}
    </div>
  );
}
