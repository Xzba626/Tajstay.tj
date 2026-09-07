"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
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
  hotels = []
}: {
  locale: Locale;
  rooms: RoomRow[];
  typeRows?: RoomTypeCalendarRow[];
  days: DayCol[];
  cells: Record<string, CalendarCellKind>;
  cellMeta?: Record<string, CalendarCellMeta>;
  hotels?: HotelFilter[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"room" | "type">("room");
  const [hotelFilter, setHotelFilter] = useState<number | "all">("all");
  const [roomFilter, setRoomFilter] = useState<number | "all">("all");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ roomId: number; dayKey: string; kind: CalendarCellKind } | null>(null);

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

  const onCellClick = useCallback(
    (rId: number, dayKey: string, kind: CalendarCellKind) => {
      setError(null);
      if (BOOKING_KINDS.includes(kind)) {
        setDetail({ roomId: rId, dayKey, kind });
        return;
      }
      setDetail(null);
      if (roomId !== rId || !rangeStart) {
        setRoomId(rId);
        setRangeStart(dayKey);
        setRangeEnd(null);
        return;
      }
      setRangeEnd(dayKey);
    },
    [roomId, rangeStart]
  );

  const clearSelection = () => {
    setRoomId(null);
    setRangeStart(null);
    setRangeEnd(null);
    setCustomPrice("");
    setError(null);
    setDetail(null);
  };

  const applyBulk = async (opts: { isBlocked?: boolean; customPrice?: number | null; clear?: boolean }) => {
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
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "failed");
        return;
      }
      clearSelection();
      router.refresh();
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  };

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

  const selectedBookingId = detailMeta?.bookingId ?? null;

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

      {(hotels.length > 1 || rooms.length > 1) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hotels.length > 1 ? (
            <select
              value={hotelFilter === "all" ? "" : String(hotelFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setHotelFilter(v ? Number(v) : "all");
                setRoomFilter("all");
              }}
              className="h-9 max-w-[min(100%,14rem)] rounded-lg border border-slate-200 px-2 text-xs"
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
              className="h-9 max-w-[min(100%,14rem)] rounded-lg border border-slate-200 px-2 text-xs"
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
                className="owner-input owner-btn--sm !h-8 !w-24 !text-xs"
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
          {error ? <p className="owner-toast--error mt-2">{m(locale, "owner.calendar.actionError")}</p> : null}
        </div>
      ) : null}

      <div className="owner-calendar-scroll mt-3 max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-[var(--owner-border)]">
        <table className="owner-calendar-table min-w-[720px] border-collapse text-xs md:min-w-[980px]">
          <thead className="sticky top-0 z-20">
            <tr className="owner-calendar-table__head">
              <th className="owner-calendar-table__row-label sticky left-0 z-30">
                {viewMode === "type" ? m(locale, "owner.calendar.roomCol") : m(locale, "owner.calendar.roomCol")}
              </th>
              {days.map((d) => (
                <th key={d.key} className="owner-calendar-table__day">
                  <span className="block text-[10px] leading-tight md:text-xs">
                    {d.day}.{String(d.month).padStart(2, "0")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewMode === "type"
              ? typeRows.map((rt) => (
                  <tr key={rt.id}>
                    <td className="owner-calendar-table__row-label sticky left-0 z-10">
                      <div className="owner-calendar-table__row-title">{rt.name}</div>
                      <div className="owner-calendar-table__row-sub">{rt.hotelName}</div>
                    </td>
                    {days.map((d) => {
                      const snap = rt.cells[d.key] ?? { available: 0, total: 0 };
                      const full = snap.total > 0 && snap.available === 0;
                      return (
                        <td key={`${rt.id}|${d.key}`} className="border-b border-r px-1 py-1.5 text-center">
                          <span
                            className={`owner-type-avail ${
                              full
                                ? "owner-type-avail--full"
                                : snap.available > 0
                                  ? "owner-type-avail--partial"
                                  : "owner-type-avail--empty"
                            }`}
                            title={m(locale, "pms.typeAvailability", {
                              available: String(snap.available),
                              total: String(snap.total)
                            })}
                          >
                            {snap.available}/{snap.total}
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
                    {r.title}
                    {r.status && r.status !== "ACTIVE" ? ` · ${r.status}` : ""}
                  </div>
                </td>
                {days.map((d) => {
                  const key = `${r.id}|${d.key}`;
                  const kind = cells[key] ?? "available";
                  const meta = cellMeta[key];
                  const tip = cellTooltip(kind, meta, locale);
                  const selected = roomId === r.id && inRange(d.key, rangeStart, rangeEnd, days);
                  return (
                    <td key={key} className="border-b border-r px-0.5 py-1 text-center">
                      <button
                        type="button"
                        title={tip}
                        onClick={() => onCellClick(r.id, d.key, kind)}
                        className={`mx-auto flex h-8 w-8 items-center justify-center transition md:h-7 md:w-7 ${CELL_CLASS[kind]} ${
                          selected ? "owner-cal-cell--selected" : ""
                        } ${kind === "available" ? "rounded-full" : "rounded-md"}`}
                        aria-pressed={selected}
                        aria-label={`${r.title} ${d.key} ${tip}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && detailMeta?.bookingId ? (
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
            <button type="button" onClick={() => setDetail(null)} className="owner-btn owner-btn--ghost owner-btn--sm" aria-label={m(locale, "owner.calendar.detailClose")}>
              ✕
            </button>
          </div>
          <dl className="owner-calendar-detail__rows">
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
              <dd className="owner-calendar-detail__value">{detailMeta.status ?? detail.kind}</dd>
            </div>
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
      ) : null}
    </div>
  );
}
