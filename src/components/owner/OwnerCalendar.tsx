"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ownerBookingSourceLabel, ownerStatusLabel } from "@/lib/i18n/ownerPresentation";
import type { CalendarCellKind, CalendarCellMeta, RoomTypeCalendarRow } from "@/lib/services/ownerCalendar";

type RoomRow = {
  id: number;
  title: string;
  roomNumber?: string | null;
  status?: string;
  housekeepingStatus?: string;
  hotel: { name: string; id?: number };
};

type HotelFilter = { id: number; name: string };

type DayCol = { key: string; day: number; month: number };

const CELL_CLASS: Record<CalendarCellKind, string> = {
  available: "owner-cal-cell owner-cal-cell--available",
  blocked: "owner-cal-cell owner-cal-cell--blocked",
  customPrice: "owner-cal-cell owner-cal-cell--custom",
  online: "owner-cal-cell owner-cal-cell--online",
  offline: "owner-cal-cell owner-cal-cell--offline",
  onlinePending: "owner-cal-cell owner-cal-cell--pending"
};

const BOOKING_KINDS: CalendarCellKind[] = ["online", "offline", "onlinePending"];

function inRange(dayKey: string, start: string | null, end: string | null, days: DayCol[]): boolean {
  if (!start) return false;
  const endKey = end ?? start;
  const keys = days.map((d) => d.key);
  const i0 = keys.indexOf(start);
  const i1 = keys.indexOf(endKey);
  if (i0 < 0 || i1 < 0) return false;
  const lo = Math.min(i0, i1);
  const hi = Math.max(i0, i1);
  const idx = keys.indexOf(dayKey);
  return idx >= lo && idx <= hi;
}

function cellTooltip(kind: CalendarCellKind, meta: CalendarCellMeta | undefined, locale: Locale): string {
  if (kind === "online" || kind === "offline") {
    const code = meta?.publicCode ? ` #${meta.publicCode}` : meta?.bookingId ? ` #${meta.bookingId}` : "";
    return `${m(locale, "owner.calendar.tooltip.occupied")}${code}`;
  }
  if (kind === "onlinePending") return m(locale, "owner.calendar.tooltip.pending");
  if (kind === "blocked") return m(locale, "owner.calendar.tooltip.blocked");
  if (kind === "customPrice") return m(locale, "owner.calendar.legend.customPrice");
  return m(locale, "owner.calendar.legend.available");
}

export function OwnerCalendar({
  locale,
  rooms,
  typeRows = [],
  days,
  cells,
  cellMeta = {},
  hotels = [],
  activeHotelId = 0
}: {
  locale: Locale;
  rooms: RoomRow[];
  typeRows?: RoomTypeCalendarRow[];
  days: DayCol[];
  cells: Record<string, CalendarCellKind>;
  cellMeta?: Record<string, CalendarCellMeta>;
  hotels?: HotelFilter[];
  /** Canonical Owner hotel scope from URL — do not default to "all hotels". */
  activeHotelId?: number;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"room" | "type">("room");
  const [hotelFilter, setHotelFilter] = useState<number | "all">(activeHotelId > 0 ? activeHotelId : "all");
  const [roomFilter, setRoomFilter] = useState<number | "all">("all");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ roomId: number; dayKey: string; kind: CalendarCellKind } | null>(null);
  const [mobileDayKey, setMobileDayKey] = useState<string>(days[0]?.key ?? "");

  useEffect(() => {
    if (activeHotelId > 0) setHotelFilter(activeHotelId);
  }, [activeHotelId]);

  useEffect(() => {
    if (days.length && !days.some((d) => d.key === mobileDayKey)) {
      setMobileDayKey(days[0].key);
    }
  }, [days, mobileDayKey]);

  const roomOptions = useMemo(() => {
    return rooms.filter((r) => hotelFilter === "all" || r.hotel.id === hotelFilter);
  }, [rooms, hotelFilter]);

  const filteredRooms = useMemo(() => {
    return roomOptions.filter((r) => roomFilter === "all" || r.id === roomFilter);
  }, [roomOptions, roomFilter]);

  const legend: { kind: CalendarCellKind; label: string }[] = useMemo(
    () => [
      { kind: "available", label: m(locale, "owner.calendar.legend.available") },
      { kind: "online", label: m(locale, "owner.calendar.legend.online") },
      { kind: "onlinePending", label: m(locale, "owner.calendar.legend.pending") },
      { kind: "blocked", label: m(locale, "owner.calendar.legend.blocked") },
      { kind: "customPrice", label: m(locale, "owner.calendar.legend.customPrice") },
      { kind: "offline", label: m(locale, "owner.calendar.legend.offline") }
    ],
    [locale]
  );

  const selectionLabel = useMemo(() => {
    if (!roomId || !rangeStart) return null;
    const end = rangeEnd ?? rangeStart;
    const room = rooms.find((r) => r.id === roomId);
    return `${room?.title ?? ""}: ${rangeStart}${end !== rangeStart ? ` — ${end}` : ""}`;
  }, [roomId, rangeStart, rangeEnd, rooms]);

  const detailMeta = useMemo(() => {
    if (!detail) return null;
    return cellMeta[`${detail.roomId}|${detail.dayKey}`];
  }, [detail, cellMeta]);

  const mobileDayRows = useMemo(() => {
    if (!mobileDayKey) return [];
    return filteredRooms.map((r) => {
      const key = `${r.id}|${mobileDayKey}`;
      const kind = cells[key] ?? "available";
      return { room: r, kind, meta: cellMeta[key] };
    });
  }, [filteredRooms, mobileDayKey, cells, cellMeta]);

  const onCellClick = useCallback(
    (rId: number, dayKey: string, kind: CalendarCellKind) => {
      if (BOOKING_KINDS.includes(kind)) {
        setDetail({ roomId: rId, dayKey, kind });
        return;
      }
      setDetail(null);
      if (roomId !== rId) {
        setRoomId(rId);
        setRangeStart(dayKey);
        setRangeEnd(null);
        return;
      }
      if (!rangeStart) {
        setRangeStart(dayKey);
        return;
      }
      if (!rangeEnd) {
        setRangeEnd(dayKey);
        return;
      }
      setRangeStart(dayKey);
      setRangeEnd(null);
    },
    [roomId, rangeStart, rangeEnd]
  );

  function clearSelection() {
    setRoomId(null);
    setRangeStart(null);
    setRangeEnd(null);
    setCustomPrice("");
    setError(null);
    setDetail(null);
  }

  async function applyBulk(opts: { isBlocked?: boolean; customPrice?: number | null; clear?: boolean }) {
    if (!roomId || !rangeStart) return;
    const start = rangeStart;
    const end = rangeEnd ?? rangeStart;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/overrides/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roomId,
          startDate: start,
          endDate: end,
          ...opts
        })
      });
      if (!res.ok) {
        setError(m(locale, "owner.calendar.actionError"));
        return;
      }
      clearSelection();
      router.refresh();
    } catch {
      setError(m(locale, "owner.calendar.actionError"));
    } finally {
      setBusy(false);
    }
  }

  const offlineHref = useMemo(() => {
    if (!roomId || !rangeStart) return "/dashboard/owner?section=offline-bookings";
    const end = rangeEnd ?? rangeStart;
    const endIdx = days.findIndex((d) => d.key === end);
    const checkOut = endIdx >= 0 && endIdx + 1 < days.length ? days[endIdx + 1].key : end;
    const params = new URLSearchParams({
      section: "offline-bookings",
      roomId: String(roomId),
      checkIn: rangeStart,
      checkOut
    });
    return `/dashboard/owner?${params.toString()}`;
  }, [roomId, rangeStart, rangeEnd, days]);

  const showHotelFilter = hotels.length > 1 && !(activeHotelId > 0);
  const selectedBookingId = detailMeta?.bookingId ?? null;

  function renderDetailDialog() {
    if (!detail || !detailMeta?.bookingId) return null;
    const ref = detailMeta.publicCode || (detailMeta.bookingId ? `#${detailMeta.bookingId}` : "—");
    return (
      <div className="owner-panel owner-calendar-detail" role="dialog" aria-labelledby="cal-detail-title">
        <div className="owner-calendar-detail__head">
          <div>
            <h3 id="cal-detail-title" className="owner-calendar-detail__title">
              {detailMeta.hotelName}
            </h3>
            <p className="owner-calendar-detail__subtitle">
              {detailMeta.roomTitle} · {detailMeta.checkIn} — {detailMeta.checkOut}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="owner-btn owner-btn--ghost owner-btn--sm"
            aria-label={m(locale, "owner.calendar.detailClose")}
          >
            ✕
          </button>
        </div>
        <dl className="owner-calendar-detail__rows">
          <div className="owner-calendar-detail__row">
            <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailReference")}</dt>
            <dd className="owner-calendar-detail__value">{ref}</dd>
          </div>
          <div className="owner-calendar-detail__row">
            <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailGuest")}</dt>
            <dd className="owner-calendar-detail__value">{detailMeta.guestLabel ?? "—"}</dd>
          </div>
          {detailMeta.guestPhone ? (
            <div className="owner-calendar-detail__row">
              <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailPhone")}</dt>
              <dd className="owner-calendar-detail__value">{detailMeta.guestPhone}</dd>
            </div>
          ) : null}
          <div className="owner-calendar-detail__row">
            <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailStatus")}</dt>
            <dd className="owner-calendar-detail__value">{ownerStatusLabel(locale, detailMeta.status)}</dd>
          </div>
          {detailMeta.paymentStatus ? (
            <div className="owner-calendar-detail__row">
              <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailPayment")}</dt>
              <dd className="owner-calendar-detail__value">{ownerStatusLabel(locale, detailMeta.paymentStatus)}</dd>
            </div>
          ) : null}
          {detailMeta.source ? (
            <div className="owner-calendar-detail__row">
              <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailSource")}</dt>
              <dd className="owner-calendar-detail__value">{ownerBookingSourceLabel(locale, detailMeta.source)}</dd>
            </div>
          ) : null}
          {detailMeta.totalPrice ? (
            <div className="owner-calendar-detail__row">
              <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailAmount")}</dt>
              <dd className="owner-calendar-detail__value">
                {detailMeta.totalPrice} {m(locale, "owner.calendar.currency")}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="owner-calendar-detail__actions">
          <Link href={`/chat/booking/${detailMeta.bookingId}`} className="owner-btn owner-btn--primary owner-btn--sm">
            {m(locale, "owner.calendar.openBooking")}
          </Link>
          <button type="button" onClick={() => setDetail(null)} className="owner-btn owner-btn--secondary owner-btn--sm">
            {m(locale, "owner.calendar.detailClose")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-panel owner-calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="owner-panel__title">{m(locale, "owner.calendar.gridTitle")}</div>
          <p className="owner-panel__meta">{m(locale, "owner.calendar.clickHint")}</p>
        </div>
        <div className="owner-calendar__legend">
          {legend.map((item) => (
            <span key={item.kind} className="inline-flex shrink-0 items-center gap-1.5">
              <span className={`owner-cal-cell owner-cal-cell--legend owner-cal-cell--${item.kind}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="owner-quick-actions mt-3">
        <button
          type="button"
          onClick={() => setViewMode("type")}
          className={`owner-btn owner-btn--sm ${viewMode === "type" ? "owner-btn--primary" : "owner-btn--secondary"}`}
        >
          {m(locale, "pms.viewByType")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("room")}
          className={`owner-btn owner-btn--sm ${viewMode === "room" ? "owner-btn--primary" : "owner-btn--secondary"}`}
        >
          {m(locale, "pms.viewByRoom")}
        </button>
      </div>

      {(showHotelFilter || rooms.length > 1) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {showHotelFilter ? (
            <select
              value={hotelFilter === "all" ? "" : String(hotelFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setHotelFilter(v ? Number(v) : "all");
                setRoomFilter("all");
              }}
              className="owner-input h-11 max-w-[min(100%,14rem)] text-xs"
              aria-label={m(locale, "owner.calendar.filterHotel")}
            >
              <option value="">{m(locale, "owner.calendar.filterAllHotels")}</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          ) : null}
          {rooms.length > 1 ? (
            <select
              value={roomFilter === "all" ? "" : String(roomFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setRoomFilter(v ? Number(v) : "all");
              }}
              className="owner-input h-11 max-w-[min(100%,14rem)] text-xs"
              aria-label={m(locale, "owner.calendar.filterRoom")}
            >
              <option value="">{m(locale, "owner.calendar.filterAllRooms")}</option>
              {roomOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      )}

      {selectionLabel ? (
        <div className="owner-panel owner-panel--accent mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="owner-panel__title">{m(locale, "owner.calendar.selection")}</p>
              <p className="owner-panel__body">{selectionLabel}</p>
            </div>
            <button type="button" onClick={clearSelection} className="owner-link text-xs">
              {m(locale, "owner.calendar.clearSelection")}
            </button>
          </div>
          <div className="owner-quick-actions mt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyBulk({ isBlocked: true })}
              className="owner-btn owner-btn--secondary owner-btn--sm"
            >
              {m(locale, "owner.block")}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={m(locale, "owner.priceIfOpen")}
                className="owner-input owner-btn--sm !h-11 !w-24 !text-xs"
              />
              <button
                type="button"
                disabled={busy || !customPrice}
                onClick={() => void applyBulk({ isBlocked: false, customPrice: Number(customPrice) })}
                className="owner-btn owner-btn--primary owner-btn--sm"
              >
                {m(locale, "owner.calendar.setPrice")}
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyBulk({ clear: true })}
              className="owner-btn owner-btn--secondary owner-btn--sm"
            >
              {m(locale, "owner.calendar.clearOverride")}
            </button>
            <Link href={offlineHref} className="owner-btn owner-btn--primary owner-btn--sm">
              {m(locale, "owner.quick.offlineBooking")}
            </Link>
            {selectedBookingId ? (
              <Link href={`/chat/booking/${selectedBookingId}`} className="owner-btn owner-btn--secondary owner-btn--sm">
                {m(locale, "owner.calendar.openBooking")}
              </Link>
            ) : null}
          </div>
          {error ? <p className="owner-toast--error mt-2">{error}</p> : null}
        </div>
      ) : null}

      <div className="owner-calendar-mobile mt-3 md:hidden">
        <div className="owner-calendar-daystrip" role="tablist" aria-label={m(locale, "owner.calendar.dayStrip")}>
          {days.slice(0, 14).map((d) => {
            const active = d.key === mobileDayKey;
            return (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`owner-calendar-daystrip__day${active ? " is-active" : ""}`}
                onClick={() => setMobileDayKey(d.key)}
              >
                <span className="owner-calendar-daystrip__num">{d.day}</span>
                <span className="owner-calendar-daystrip__mon">{d.month}</span>
              </button>
            );
          })}
        </div>
        <ul className="owner-calendar-daylist mt-3 space-y-2">
          {mobileDayRows.map(({ room: r, kind, meta }) => (
            <li key={r.id}>
              <button
                type="button"
                className="owner-calendar-daylist__row"
                onClick={() => onCellClick(r.id, mobileDayKey, kind)}
              >
                <span className="owner-calendar-daylist__room">
                  <span className="owner-calendar-daylist__title">{r.roomNumber ?? r.title}</span>
                  <span className="owner-calendar-daylist__sub">{r.hotel.name}</span>
                </span>
                <span className={`owner-cal-cell owner-cal-cell--legend owner-cal-cell--${kind}`} aria-hidden />
                <span className="owner-calendar-daylist__status">
                  {BOOKING_KINDS.includes(kind)
                    ? meta?.publicCode ||
                      ownerStatusLabel(locale, meta?.status) ||
                      cellTooltip(kind, meta, locale)
                    : cellTooltip(kind, meta, locale)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="owner-calendar-scroll mt-3 hidden max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-[var(--owner-border)] md:block">
        <table className="owner-calendar-table min-w-[720px] border-collapse text-xs md:min-w-[980px]">
          <thead>
            <tr className="owner-calendar-table__head">
              <th className="owner-calendar-table__row-label sticky left-0 z-30">
                {viewMode === "type" ? m(locale, "pms.viewByType") : m(locale, "pms.viewByRoom")}
              </th>
              {days.map((d) => (
                <th key={d.key} className="owner-calendar-table__day">
                  {d.day}.{d.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewMode === "type"
              ? typeRows.map((rt) => (
                  <tr key={`t-${rt.id}`}>
                    <td className="owner-calendar-table__row-label sticky left-0 z-10">
                      <div className="owner-calendar-table__row-title">{rt.name}</div>
                      <div className="owner-calendar-table__row-sub">{rt.hotelName}</div>
                    </td>
                    {days.map((d) => {
                      const summary = rt.cells[d.key];
                      const free = summary ? summary.available : 0;
                      const total = summary ? summary.total : 0;
                      const kind: CalendarCellKind =
                        free <= 0 ? "online" : free < total ? "onlinePending" : "available";
                      return (
                        <td key={d.key} className="p-0.5 text-center">
                          <span className={CELL_CLASS[kind]} title={`${free}/${total}`}>
                            {free}/{total}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              : filteredRooms.map((r) => (
                  <tr key={r.id}>
                    <td className="owner-calendar-table__row-label sticky left-0 z-10">
                      <div className="owner-calendar-table__row-title">{r.roomNumber ?? r.title}</div>
                      <div className="owner-calendar-table__row-sub">
                        {r.hotel.name}
                        {r.housekeepingStatus ? ` · ${r.housekeepingStatus}` : ""}
                      </div>
                    </td>
                    {days.map((d) => {
                      const key = `${r.id}|${d.key}`;
                      const kind = cells[key] ?? "available";
                      const meta = cellMeta[key];
                      const selected = roomId === r.id && inRange(d.key, rangeStart, rangeEnd, days);
                      return (
                        <td key={d.key} className="p-0.5 text-center">
                          <button
                            type="button"
                            className={`${CELL_CLASS[kind]} ${selected ? "owner-cal-cell--selected" : ""}`}
                            title={cellTooltip(kind, meta, locale)}
                            onClick={() => onCellClick(r.id, d.key, kind)}
                          >
                            {kind === "customPrice" && meta?.customPrice ? meta.customPrice : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {renderDetailDialog()}
    </div>
  );
}
