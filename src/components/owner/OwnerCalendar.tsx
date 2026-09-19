"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ownerBookingSourceLabel, ownerStatusLabel } from "@/lib/i18n/ownerPresentation";
import type { CalendarCellKind, CalendarCellMeta } from "@/lib/services/ownerCalendar";

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
  occupied: "owner-cal-cell owner-cal-cell--occupied",
  pending: "owner-cal-cell owner-cal-cell--pending"
};

const BOOKING_KINDS: CalendarCellKind[] = ["occupied", "pending"];
const FILTER_KINDS: CalendarCellKind[] = ["available", "occupied", "pending", "blocked"];

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
  if (kind === "occupied") {
    const code = meta?.publicCode ? ` #${meta.publicCode}` : meta?.bookingId ? ` #${meta.bookingId}` : "";
    return `${m(locale, "owner.calendar.tooltip.occupied")}${code}`;
  }
  if (kind === "pending") return m(locale, "owner.calendar.tooltip.pending");
  if (kind === "blocked") return m(locale, "owner.calendar.tooltip.blocked");
  return m(locale, "owner.calendar.legend.available");
}

export function OwnerCalendar({
  locale,
  rooms,
  days,
  cells,
  cellMeta = {},
  hotels = [],
  activeHotelId = 0
}: {
  locale: Locale;
  rooms: RoomRow[];
  days: DayCol[];
  cells: Record<string, CalendarCellKind>;
  cellMeta?: Record<string, CalendarCellMeta>;
  hotels?: HotelFilter[];
  activeHotelId?: number;
}) {
  const router = useRouter();
  const [hotelFilter, setHotelFilter] = useState<number | "all">(activeHotelId > 0 ? activeHotelId : "all");
  const [highlight, setHighlight] = useState<CalendarCellKind | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ roomId: number; dayKey: string; kind: CalendarCellKind } | null>(null);

  useEffect(() => {
    if (activeHotelId > 0) setHotelFilter(activeHotelId);
  }, [activeHotelId]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => hotelFilter === "all" || r.hotel.id === hotelFilter);
  }, [rooms, hotelFilter]);

  const chipLabels = useMemo(
    () =>
      FILTER_KINDS.map((kind) => ({
        kind,
        label:
          kind === "available"
            ? m(locale, "owner.calendar.legend.available")
            : kind === "occupied"
              ? m(locale, "owner.calendar.legend.occupied")
              : kind === "pending"
                ? m(locale, "owner.calendar.legend.pending")
                : m(locale, "owner.calendar.legend.blocked")
      })),
    [locale]
  );

  const selectionLabel = useMemo(() => {
    if (!roomId || !rangeStart) return null;
    const end = rangeEnd ?? rangeStart;
    const room = rooms.find((r) => r.id === roomId);
    return `${room?.roomNumber ?? room?.title ?? ""}: ${rangeStart}${end !== rangeStart ? ` — ${end}` : ""}`;
  }, [roomId, rangeStart, rangeEnd, rooms]);

  const detailMeta = useMemo(() => {
    if (!detail) return null;
    return cellMeta[`${detail.roomId}|${detail.dayKey}`];
  }, [detail, cellMeta]);

  const onCellClick = useCallback(
    (rId: number, dayKey: string, kind: CalendarCellKind) => {
      if (BOOKING_KINDS.includes(kind)) {
        setDetail({ roomId: rId, dayKey, kind });
        return;
      }
      if (kind === "blocked") {
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
    setError(null);
    setDetail(null);
  }

  async function applyBulk(opts: { isBlocked?: boolean; clear?: boolean }) {
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
        body: JSON.stringify({ roomId, startDate: start, endDate: end, ...opts })
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

  function cellDimmed(kind: CalendarCellKind): boolean {
    return Boolean(highlight && highlight !== kind);
  }

  function renderGrid() {
    return (
      <div className="owner-calendar-scroll" data-testid="owner-calendar-grid">
        <table className="owner-calendar-table">
          <thead>
            <tr className="owner-calendar-table__head">
              <th className="owner-calendar-table__row-label sticky left-0 z-30">
                {m(locale, "owner.calendar.roomCol")}
              </th>
              {days.map((d) => (
                <th key={d.key} className="owner-calendar-table__day sticky top-0 z-20">
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((r) => (
              <tr key={r.id}>
                <td className="owner-calendar-table__row-label sticky left-0 z-10">
                  <div className="owner-calendar-table__row-title">{r.roomNumber ?? r.title}</div>
                  <div className="owner-calendar-table__row-sub">{r.hotel.name}</div>
                </td>
                {days.map((d) => {
                  const key = `${r.id}|${d.key}`;
                  const kind = cells[key] ?? "available";
                  const meta = cellMeta[key];
                  const selected = roomId === r.id && inRange(d.key, rangeStart, rangeEnd, days);
                  const dim = cellDimmed(kind);
                  const rangeClass =
                    selected && BOOKING_KINDS.includes(kind) === false
                      ? "owner-cal-cell--selected"
                      : selected
                        ? "owner-cal-cell--range"
                        : "";
                  return (
                    <td key={d.key} className="owner-calendar-table__cell">
                      <button
                        type="button"
                        className={`${CELL_CLASS[kind]} ${rangeClass}${dim ? " owner-cal-cell--dim" : ""}`}
                        title={cellTooltip(kind, meta, locale)}
                        aria-label={cellTooltip(kind, meta, locale)}
                        onClick={() => onCellClick(r.id, d.key, kind)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="owner-panel owner-calendar">
      <div className="owner-calendar__toolbar">
        <div className="owner-calendar__chips" role="group" aria-label={m(locale, "owner.calendar.filtersAria")}>
          {chipLabels.map((item) => {
            const active = highlight === item.kind;
            return (
              <button
                key={item.kind}
                type="button"
                className={`owner-cal-chip owner-cal-chip--${item.kind}${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => setHighlight((h) => (h === item.kind ? null : item.kind))}
              >
                <span className={`owner-cal-chip__swatch owner-cal-cell--${item.kind}`} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="owner-calendar__help"
          aria-expanded={helpOpen}
          aria-label={m(locale, "owner.calendar.helpAria")}
          onClick={() => setHelpOpen((v) => !v)}
        >
          <HelpCircle size={18} aria-hidden />
        </button>
      </div>

      {helpOpen ? (
        <div className="owner-calendar__help-sheet" role="note">
          <p>{m(locale, "owner.calendar.helpBody")}</p>
        </div>
      ) : null}

      {showHotelFilter ? (
        <div className="mt-2">
          <select
            value={hotelFilter === "all" ? "" : String(hotelFilter)}
            onChange={(e) => setHotelFilter(e.target.value ? Number(e.target.value) : "all")}
            className="owner-input h-11 max-w-[min(100%,16rem)] text-xs"
            aria-label={m(locale, "owner.calendar.filterHotel")}
          >
            <option value="">{m(locale, "owner.calendar.filterAllHotels")}</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {selectionLabel ? (
        <div className="owner-panel owner-panel--accent mt-3">
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
          </div>
          {error ? <p className="owner-toast--error mt-2">{error}</p> : null}
        </div>
      ) : null}

      <div className="mt-3">{renderGrid()}</div>

      {detail && detail.kind === "blocked" ? (
        <div className="owner-panel owner-calendar-detail mt-3" role="dialog">
          <div className="owner-calendar-detail__head">
            <h3 className="owner-calendar-detail__title">{m(locale, "owner.calendar.legend.blocked")}</h3>
            <button type="button" className="owner-btn owner-btn--ghost owner-btn--sm" onClick={() => setDetail(null)}>
              ✕
            </button>
          </div>
          <p className="owner-panel__body">
            {rooms.find((r) => r.id === detail.roomId)?.roomNumber ?? detail.roomId} · {detail.dayKey}
          </p>
          <div className="owner-calendar-detail__actions">
            <button
              type="button"
              className="owner-btn owner-btn--primary owner-btn--sm"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/owner/overrides/bulk", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        roomId: detail.roomId,
                        startDate: detail.dayKey,
                        endDate: detail.dayKey,
                        clear: true
                      })
                    });
                    if (!res.ok) {
                      setError(m(locale, "owner.calendar.actionError"));
                      return;
                    }
                    setDetail(null);
                    router.refresh();
                  } catch {
                    setError(m(locale, "owner.calendar.actionError"));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {m(locale, "owner.calendar.openDates")}
            </button>
          </div>
        </div>
      ) : null}

      {detail && detailMeta?.bookingId ? (
        <div className="owner-panel owner-calendar-detail mt-3" role="dialog" aria-labelledby="cal-detail-title">
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
              <dd className="owner-calendar-detail__value">
                {detailMeta.publicCode || `#${detailMeta.bookingId}`}
              </dd>
            </div>
            <div className="owner-calendar-detail__row">
              <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailGuest")}</dt>
              <dd className="owner-calendar-detail__value">{detailMeta.guestLabel ?? "—"}</dd>
            </div>
            <div className="owner-calendar-detail__row">
              <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailStatus")}</dt>
              <dd className="owner-calendar-detail__value">{ownerStatusLabel(locale, detailMeta.status)}</dd>
            </div>
            {detailMeta.source ? (
              <div className="owner-calendar-detail__row">
                <dt className="owner-calendar-detail__label">{m(locale, "owner.calendar.detailSource")}</dt>
                <dd className="owner-calendar-detail__value">{ownerBookingSourceLabel(locale, detailMeta.source)}</dd>
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
