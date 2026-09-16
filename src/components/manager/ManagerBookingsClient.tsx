"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/use-locale";
import { m } from "@/lib/i18n/messages";

type Hotel = { id: number; name: string };
type BookingRow = {
  id: number;
  publicCode: string | null;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  source: string;
  totalPrice: number;
  categoryName: string | null;
  roomLabel: string | null;
  payOnArrival: boolean;
  settlementChannel: string | null;
};

export function ManagerBookingsClient() {
  const locale = useLocale();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelId, setHotelId] = useState(0);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/manager/bookings", { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        const list = (json.hotels ?? []) as Hotel[];
        setHotels(list);
        if (list[0]) setHotelId(list[0].id);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ hotelId: String(hotelId), filter });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/manager/bookings?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "failed");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }, [hotelId, filter, q]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  async function markPaid(id: number, settlement: "CASH" | "CARD") {
    setPayingId(id);
    try {
      const res = await fetch(`/api/manager/bookings/${id}/payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, settlement })
      });
      if (res.ok) void load();
    } finally {
      setPayingId(null);
    }
  }

  function sourceLabel(source: string) {
    if (source === "PLATFORM") return m(locale, "manager.sourceOnline");
    if (source === "MANAGER_MANUAL") return m(locale, "manager.sourceManager");
    if (source === "OWNER_MANUAL") return m(locale, "manager.sourceOwner");
    return m(locale, "manager.sourceUnknown");
  }

  function payLabel(status: string) {
    if (status === "PAID") return m(locale, "manager.payPaid");
    if (status === "PENDING") return m(locale, "manager.payPending");
    return status;
  }

  return (
    <div className="manager-page">
      <h1 className="manager-page__title">{m(locale, "manager.bookingsTitle")}</h1>

      {hotels.length > 1 ? (
        <select className="manager-select" value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))}>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      ) : null}

      <label className="manager-search">
        <span className="sr-only">{m(locale, "manager.search")}</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={m(locale, "manager.searchPlaceholder")}
        />
      </label>

      <div className="manager-chips" role="tablist">
        {(
          [
            ["all", "manager.filterAll"],
            ["action", "manager.filterAction"],
            ["confirmed", "manager.filterConfirmed"],
            ["archive", "manager.filterArchive"]
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            className={filter === key ? "is-active" : undefined}
            onClick={() => setFilter(key)}
          >
            {m(locale, labelKey)}
          </button>
        ))}
      </div>

      {loading ? <p>{m(locale, "manager.loading")}</p> : null}
      {error ? <p role="alert">{m(locale, "manager.err.generic")}</p> : null}
      {!loading && !items.length ? <p>{m(locale, "manager.bookingsEmpty")}</p> : null}

      <ul className="manager-booking-list">
        {items.map((b) => (
          <li key={b.id} className="manager-booking-card">
            <div className="manager-booking-card__top">
              <strong>{b.guestName}</strong>
              <span>{b.publicCode ?? `#${b.id}`}</span>
            </div>
            <div className="manager-booking-card__meta">
              {b.roomLabel || b.categoryName} · {b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)}
            </div>
            <div className="manager-booking-card__meta">
              {sourceLabel(b.source)} · {payLabel(b.paymentStatus)} · {b.totalPrice} TJS
            </div>
            {b.paymentStatus === "PENDING" ? (
              <div className="manager-booking-card__actions">
                <button type="button" disabled={payingId === b.id} onClick={() => void markPaid(b.id, "CASH")}>
                  {m(locale, "manager.markCash")}
                </button>
                <button type="button" disabled={payingId === b.id} onClick={() => void markPaid(b.id, "CARD")}>
                  {m(locale, "manager.markCard")}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
