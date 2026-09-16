"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/use-locale";
import { m } from "@/lib/i18n/messages";

type Hotel = { id: number; name: string };
type Card = {
  id: number;
  publicCode: string | null;
  guestName: string;
  roomLabel: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  payOnArrival: boolean;
};

type Board = {
  businessDate: string;
  arrivals: Card[];
  departures: Card[];
  inHouse: Card[];
  counts: { arrivals: number; departures: number; inHouse: number };
};

export function ManagerTodayClient() {
  const locale = useLocale();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelId, setHotelId] = useState(0);
  const [tab, setTab] = useState<"arrivals" | "departures" | "inHouse">("arrivals");
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
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
    try {
      const res = await fetch(`/api/manager/today?hotelId=${hotelId}`, { credentials: "include" });
      const json = await res.json();
      if (res.ok) setBoard(json);
      else setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPaid(id: number) {
    setPayingId(id);
    try {
      await fetch(`/api/manager/bookings/${id}/payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, settlement: "CASH" })
      });
      void load();
    } finally {
      setPayingId(null);
    }
  }

  const list = board ? board[tab] : [];

  return (
    <div className="manager-page">
      <h1 className="manager-page__title">{m(locale, "manager.todayTitle")}</h1>
      {board ? (
        <p className="manager-page__sub">
          {m(locale, "manager.businessDate")}: {board.businessDate}
        </p>
      ) : null}

      {hotels.length > 1 ? (
        <select className="manager-select" value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))}>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="manager-chips" role="tablist">
        <button type="button" className={tab === "arrivals" ? "is-active" : undefined} onClick={() => setTab("arrivals")}>
          {m(locale, "manager.arrivals")} {board ? board.counts.arrivals : "…"}
        </button>
        <button
          type="button"
          className={tab === "departures" ? "is-active" : undefined}
          onClick={() => setTab("departures")}
        >
          {m(locale, "manager.departures")} {board ? board.counts.departures : "…"}
        </button>
        <button type="button" className={tab === "inHouse" ? "is-active" : undefined} onClick={() => setTab("inHouse")}>
          {m(locale, "manager.inHouse")} {board ? board.counts.inHouse : "…"}
        </button>
      </div>

      {loading ? <p>{m(locale, "manager.loading")}</p> : null}
      {!loading && !list.length ? (
        <p>
          {tab === "arrivals"
            ? m(locale, "manager.emptyArrivals")
            : tab === "departures"
              ? m(locale, "manager.emptyDepartures")
              : m(locale, "manager.emptyInHouse")}
        </p>
      ) : null}

      <ul className="manager-booking-list">
        {list.map((b) => (
          <li key={b.id} className="manager-booking-card">
            <div className="manager-booking-card__top">
              <strong>{b.guestName}</strong>
              <span>{b.publicCode ?? `#${b.id}`}</span>
            </div>
            <div className="manager-booking-card__meta">
              {b.roomLabel} · {b.paymentStatus === "PAID" ? m(locale, "manager.payPaid") : m(locale, "manager.payPending")}
            </div>
            {tab === "arrivals" && b.paymentStatus === "PENDING" ? (
              <button type="button" disabled={payingId === b.id} onClick={() => void markPaid(b.id)}>
                {m(locale, "manager.confirmPayment")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
