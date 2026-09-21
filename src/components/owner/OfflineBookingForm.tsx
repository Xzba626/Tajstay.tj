"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { OFFLINE_STATUS } from "@/lib/domain/booking";

type Quote = { pricePerNight: number; nights: number; total: number; maxGuests: number };

type RoomTypeOption = { id: number; name: string; hotel: { name: string } };
type RoomOption = {
  id: number;
  title: string;
  roomNumber?: string | null;
  roomTypeId?: number | null;
  hotel: { name: string };
};

export function OfflineBookingForm({
  locale,
  roomTypes,
  rooms,
  error,
  created,
  defaultRoomId,
  defaultCheckIn,
  defaultCheckOut
}: {
  locale: Locale;
  roomTypes: RoomTypeOption[];
  rooms: RoomOption[];
  error?: string;
  created?: boolean;
  defaultRoomId?: number;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
}) {
  const defaultTypeId = useMemo(() => {
    if (!defaultRoomId) return roomTypes[0]?.id ?? 0;
    return rooms.find((r) => r.id === defaultRoomId)?.roomTypeId ?? roomTypes[0]?.id ?? 0;
  }, [defaultRoomId, roomTypes, rooms]);

  const [roomTypeId, setRoomTypeId] = useState(defaultTypeId);

  const roomsForType = useMemo(
    () => rooms.filter((r) => !roomTypeId || r.roomTypeId === roomTypeId),
    [rooms, roomTypeId]
  );

  // Controlled roomId: an uncontrolled `defaultValue` select kept a stale roomId selected after a
  // category switch (the option vanished from the DOM but the submitted value could survive).
  const [roomId, setRoomId] = useState<string>(defaultRoomId ? String(defaultRoomId) : "");
  const [checkIn, setCheckIn] = useState(defaultCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(defaultCheckOut ?? "");
  const [guestCount, setGuestCount] = useState(1);
  const [priceOverride, setPriceOverride] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);

  // Clear a room that does not belong to the newly selected category.
  useEffect(() => {
    if (roomId && !roomsForType.some((r) => String(r.id) === roomId)) setRoomId("");
  }, [roomsForType, roomId]);

  // Authoritative quote from the server. Race-guarded: a slower earlier request must never
  // overwrite the result of a newer one (§9).
  const quoteSeq = useRef(0);
  useEffect(() => {
    if (!roomTypeId || !checkIn || !checkOut || checkOut <= checkIn) {
      setQuote(null);
      setQuoteFailed(false);
      setQuoteLoading(false);
      return;
    }
    const seq = ++quoteSeq.current;
    setQuoteLoading(true);
    setQuoteFailed(false);
    const params = new URLSearchParams({ roomTypeId: String(roomTypeId), checkIn, checkOut });
    if (roomId) params.set("roomId", roomId);
    fetch(`/api/owner/offline-bookings/quote?${params.toString()}`, { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as (Quote & { ok?: boolean }) | null;
        if (seq !== quoteSeq.current) return; // stale response — a newer request already won
        if (!res.ok || !json?.ok) {
          setQuote(null);
          setQuoteFailed(true);
          return;
        }
        setQuote({
          pricePerNight: json.pricePerNight,
          nights: json.nights,
          total: json.total,
          maxGuests: json.maxGuests
        });
      })
      .catch(() => {
        if (seq !== quoteSeq.current) return;
        setQuote(null);
        setQuoteFailed(true);
      })
      .finally(() => {
        if (seq === quoteSeq.current) setQuoteLoading(false);
      });
  }, [roomTypeId, roomId, checkIn, checkOut]);

  const overCapacity = Boolean(quote && guestCount > quote.maxGuests);
  // No silent 0: without an authoritative quote (and without an explicit override) submission is
  // blocked rather than creating a booking at an invented price (§10).
  const canSubmit = (quote !== null || priceOverride.trim() !== "") && !overCapacity;

  if (!roomTypes.length) return null;

  return (
    <form action="/api/owner/offline-bookings" method="post" className="owner-form owner-form--grid-2 owner-form-surface">
      {created ? (
        <div className="owner-status-banner owner-status-banner--success md:col-span-2" role="status">
          {m(locale, "owner.offline.created")}
        </div>
      ) : null}
      {error === "dates" ? (
        <div className="owner-status-banner owner-status-banner--warning md:col-span-2" role="alert">
          {m(locale, "owner.offline.errDates")}
        </div>
      ) : null}
      {error && error !== "dates" ? (
        <div className="owner-status-banner owner-status-banner--danger md:col-span-2" role="alert">
          {m(locale, "owner.offline.errFailed")}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <label className="owner-field__label">{m(locale, "owner.pms.category")}</label>
        <select
          name="roomTypeId"
          required
          value={roomTypeId}
          onChange={(e) => setRoomTypeId(Number(e.target.value))}
          className="owner-select"
        >
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.hotel.name} · {rt.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="owner-field__label">{m(locale, "owner.offline.room")}</label>
        <select
          name="roomId"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="owner-select"
        >
          <option value="">{m(locale, "owner.pms.unassigned")}</option>
          {roomsForType.map((r) => (
            <option key={r.id} value={r.id}>
              {r.roomNumber ? `${r.roomNumber} · ` : ""}
              {r.title}
            </option>
          ))}
        </select>
        {quote ? (
          <p className="owner-field__hint">{m(locale, "owner.offline.capacityHint", { count: quote.maxGuests })}</p>
        ) : null}
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestName")}</label>
        <input name="guestName" required className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestPhone")}</label>
        <input name="guestPhone" required className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestEmail")}</label>
        <input name="guestEmail" type="email" className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestCount")}</label>
        <input
          name="guestCount"
          type="number"
          min={1}
          max={quote?.maxGuests}
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
          className="owner-input"
        />
        {overCapacity && quote ? (
          <p className="owner-field__hint owner-field__hint--error" role="alert">
            {m(locale, "owner.offline.capacityExceeded", { count: quote.maxGuests })}
          </p>
        ) : null}
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.checkIn")}</label>
        <input
          name="checkIn"
          type="date"
          required
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="owner-input"
        />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.checkOut")}</label>
        <input
          name="checkOut"
          type="date"
          required
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="owner-input"
        />
      </div>

      {/* Was a REQUIRED manual `totalPrice` input, which meant the server's authoritative quote
          (category basePrice × nights) never ran. Now the quote is fetched and displayed, and a
          manual value is an explicit, optional override. */}
      <div className="md:col-span-2">
        {quoteLoading ? (
          <p className="owner-field__hint">{m(locale, "owner.offline.quoteLoading")}</p>
        ) : quoteFailed ? (
          <p className="owner-field__hint owner-field__hint--error" role="alert">
            {m(locale, "owner.offline.quoteError")}
          </p>
        ) : quote ? (
          <dl className="owner-quote-summary">
            <div>
              <dt>{m(locale, "owner.offline.pricePerNight")}</dt>
              <dd>{quote.pricePerNight.toLocaleString()} TJS</dd>
            </div>
            <div>
              <dt>{m(locale, "owner.offline.nights")}</dt>
              <dd>{quote.nights}</dd>
            </div>
            <div className="owner-quote-summary__total">
              <dt>{m(locale, "owner.offline.calculatedTotal")}</dt>
              <dd>{quote.total.toLocaleString()} TJS</dd>
            </div>
          </dl>
        ) : null}

        {showOverride ? (
          <div className="mt-2">
            <label className="owner-field__label">{m(locale, "owner.offline.total")}</label>
            <input
              name="totalPrice"
              type="number"
              min={0}
              step={1}
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              className="owner-input"
            />
            <p className="owner-field__hint">{m(locale, "owner.offline.priceOverrideHint")}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowOverride(true)}
            className="owner-btn owner-btn--secondary owner-btn--sm mt-2"
          >
            {m(locale, "owner.offline.priceOverride")}
          </button>
        )}
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.prepayment")}</label>
        <input name="prepayment" type="number" min={0} step={1} className="owner-input" />
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.paymentType")}</label>
        <select name="offlinePaymentType" required className="owner-select" defaultValue="CASH">
          <option value="CASH">{m(locale, "owner.analytics.settlement.cash")}</option>
          <option value="CARD">{m(locale, "owner.analytics.settlement.card")}</option>
        </select>
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.statusLabel")}</label>
        <select name="offlineStatus" defaultValue={OFFLINE_STATUS.CONFIRMED} className="owner-select">
          {Object.values(OFFLINE_STATUS).map((s) => (
            <option key={s} value={s}>
              {m(locale, `owner.offline.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="owner-field__label">{m(locale, "owner.offline.note")}</label>
        <textarea name="offlineNote" rows={2} className="owner-textarea" />
      </div>

      <div className="md:col-span-2">
        <button type="submit" disabled={!canSubmit} className="owner-btn owner-btn--primary disabled:opacity-60">
          {m(locale, "owner.offline.submit")}
        </button>
      </div>
    </form>
  );
}
