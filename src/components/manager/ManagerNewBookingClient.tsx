"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/use-locale";
import { m } from "@/lib/i18n/messages";

type Hotel = { id: number; name: string; city: string };
type Category = { id: number; name: string; basePrice: number; maxGuests: number };
type RoomOpt = { id: number; roomNumber: string | null; title: string };

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysYmd(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ManagerNewBookingClient() {
  const locale = useLocale();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelId, setHotelId] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [roomTypeId, setRoomTypeId] = useState(0);
  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState(todayYmd());
  const [checkOut, setCheckOut] = useState(plusDaysYmd(1));
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [maxGuests, setMaxGuests] = useState(2);
  const [settlement, setSettlement] = useState<"CASH" | "CARD">("CASH");
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manager/bookings", { credentials: "include" });
        const json = await res.json();
        if (!res.ok || cancelled) return;
        const list = (json.hotels ?? []) as Hotel[];
        setHotels(list);
        if (list[0]) setHotelId(list[0].id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAvail = useCallback(async () => {
    if (!hotelId) return;
    const params = new URLSearchParams({ hotelId: String(hotelId) });
    if (roomTypeId) params.set("roomTypeId", String(roomTypeId));
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    const res = await fetch(`/api/manager/availability?${params}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok) return;
    setCategories(json.categories ?? []);
    if (!roomTypeId && json.categories?.[0]) setRoomTypeId(json.categories[0].id);
    setRooms(json.rooms ?? []);
    setTotalPrice(json.totalPrice ?? null);
    if (json.maxGuests) setMaxGuests(json.maxGuests);
  }, [hotelId, roomTypeId, checkIn, checkOut]);

  useEffect(() => {
    void refreshAvail();
  }, [refreshAvail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedCode(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/bookings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          roomTypeId,
          roomId: roomId || null,
          checkIn,
          checkOut,
          guestName,
          guestPhone,
          guestCount,
          settlement,
          markPaid: true
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "failed");
        return;
      }
      setCreatedCode(json.publicCode);
      setGuestName("");
      setGuestPhone("");
      void refreshAvail();
    } catch {
      setError("network");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="manager-page manager-page--loading">{m(locale, "manager.loading")}</div>;
  }

  if (!hotels.length) {
    return <div className="manager-page">{m(locale, "manager.noHotel")}</div>;
  }

  return (
    <div className="manager-page">
      <h1 className="manager-page__title">{m(locale, "manager.newTitle")}</h1>
      {createdCode ? (
        <div className="owner-status-banner owner-status-banner--success" role="status">
          {m(locale, "manager.createdCode", { code: createdCode })}
        </div>
      ) : null}
      {error ? (
        <div className="owner-status-banner owner-status-banner--danger" role="alert">
          {m(locale, `manager.err.${error}`) !== `manager.err.${error}`
            ? m(locale, `manager.err.${error}`)
            : m(locale, "manager.err.generic")}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="manager-form">
        {hotels.length > 1 ? (
          <label className="manager-field">
            <span>{m(locale, "manager.hotel")}</span>
            <select value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))}>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="manager-field">
          <span>{m(locale, "manager.guestName")}</span>
          <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
        </label>
        <label className="manager-field">
          <span>{m(locale, "manager.guestPhone")}</span>
          <input required value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
        </label>

        <div className="manager-field-row">
          <label className="manager-field">
            <span>{m(locale, "manager.checkIn")}</span>
            <input type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label className="manager-field">
            <span>{m(locale, "manager.checkOut")}</span>
            <input type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </label>
        </div>

        <label className="manager-field">
          <span>{m(locale, "manager.guests")}</span>
          <input
            type="number"
            min={1}
            max={maxGuests}
            required
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
          />
        </label>

        <label className="manager-field">
          <span>{m(locale, "manager.category")}</span>
          <select required value={roomTypeId} onChange={(e) => setRoomTypeId(Number(e.target.value))}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="manager-field">
          <span>{m(locale, "manager.room")}</span>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">{m(locale, "manager.roomAny")}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber ? `${r.roomNumber} · ` : ""}
                {r.title}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="manager-field">
          <legend>{m(locale, "manager.paymentMethod")}</legend>
          <label className="manager-radio">
            <input
              type="radio"
              name="settlement"
              checked={settlement === "CASH"}
              onChange={() => setSettlement("CASH")}
            />
            {m(locale, "manager.cash")}
          </label>
          <label className="manager-radio">
            <input
              type="radio"
              name="settlement"
              checked={settlement === "CARD"}
              onChange={() => setSettlement("CARD")}
            />
            {m(locale, "manager.card")}
          </label>
        </fieldset>

        <div className="manager-total" aria-live="polite">
          {m(locale, "manager.total")}:{" "}
          <strong>{totalPrice != null ? `${totalPrice} TJS` : "—"}</strong>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting || !roomTypeId}>
          {submitting ? m(locale, "manager.saving") : m(locale, "manager.create")}
        </button>
      </form>
    </div>
  );
}
