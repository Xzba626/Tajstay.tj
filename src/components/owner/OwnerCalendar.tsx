"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { CalendarCellKind, CalendarCellMeta } from "@/lib/services/ownerCalendar";

type RoomRow = {
  id: number;
  title: string;
  hotel: { name: string; id?: number };
};

type HotelFilter = { id: number; name: string };

type DayCol = { key: string; day: number; month: number };

const CELL_CLASS: Record<CalendarCellKind, string> = {
  available:
    "owner-cal-cell border border-emerald-600/30 bg-transparent hover:bg-emerald-500/[0.12] md:h-7 md:w-7",
  blocked: "owner-cal-cell border border-slate-500 bg-slate-600/75 hover:bg-slate-600",
  customPrice: "owner-cal-cell border border-violet-400/80 bg-violet-500/35 hover:bg-violet-500/50",
  online: "owner-cal-cell border border-[#22C55E] bg-[rgba(34,197,94,0.35)] hover:bg-[rgba(34,197,94,0.48)]",
  offline: "owner-cal-cell border border-orange-400 bg-orange-500/40 hover:bg-orange-500/55",
  onlinePending: "owner-cal-cell border border-[#FBBF24] bg-[rgba(251,191,36,0.22)] hover:bg-[rgba(251,191,36,0.34)]"
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
  days,
  cells,
  cellMeta = {},
  hotels = []
}: {
  locale: Locale;
  rooms: RoomRow[];
  days: DayCol[];
  cells: Record<string, CalendarCellKind>;
  cellMeta?: Record<string, CalendarCellMeta>;
  hotels?: HotelFilter[];
}) {
  const router = useRouter();
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
    <div className="owner-calendar rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{m(locale, "owner.calendar.gridTitle")}</div>
          <p className="mt-0.5 text-xs text-slate-500">{m(locale, "owner.calendar.clickHint")}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
          {legend.map((item) => (
            <span key={item.kind} className="inline-flex shrink-0 items-center gap-1.5">
              <span className={`owner-cal-cell h-3 w-3 shrink-0 ${CELL_CLASS[item.kind].replace(/md:h-7 md:w-7/g, "")}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </span>
          ))}
        </div>
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
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{m(locale, "owner.calendar.selection")}</p>
              <p className="mt-1 text-sm text-slate-700">{selectionLabel}</p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              {m(locale, "owner.calendar.clearSelection")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyBulk({ isBlocked: true })}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
                className="h-8 w-24 rounded-lg border border-slate-200 px-2 text-xs"
              />
              <button
                type="button"
                disabled={busy || !customPrice}
                onClick={() => void applyBulk({ isBlocked: false, customPrice: Number(customPrice) })}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {m(locale, "owner.calendar.setPrice")}
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyBulk({ clear: true })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {m(locale, "owner.calendar.clearOverride")}
            </button>
            <Link
              href={offlineHref}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {m(locale, "owner.quick.offlineBooking")}
            </Link>
            {selectedBookingId ? (
              <Link
                href={`/chat/booking/${selectedBookingId}`}
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800"
              >
                {m(locale, "owner.calendar.openBooking")}
              </Link>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-xs text-red-600">{m(locale, "owner.calendar.actionError")}</p> : null}
        </div>
      ) : null}

      <div className="owner-calendar-scroll mt-3 max-h-[min(70vh,520px)] overflow-auto rounded-xl border">
        <table className="min-w-[720px] border-collapse text-xs md:min-w-[980px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-30 min-w-[7.5rem] border-b border-r bg-slate-50 px-3 py-2 text-left text-slate-700 shadow-[2px_0_6px_rgba(0,0,0,0.06)]">
                {m(locale, "owner.calendar.roomCol")}
              </th>
              {days.map((d) => (
                <th key={d.key} className="min-w-[2.25rem] border-b border-r px-1 py-2 text-center text-slate-600">
                  <span className="block text-[10px] leading-tight md:text-xs">
                    {d.day}.{String(d.month).padStart(2, "0")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((r) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 min-w-[7.5rem] border-b border-r bg-white px-3 py-2 shadow-[2px_0_6px_rgba(0,0,0,0.05)]">
                  <div className="font-semibold text-slate-800">{r.title}</div>
                  <div className="text-[11px] text-slate-500">{r.hotel.name}</div>
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
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition ring-offset-1 md:h-7 md:w-7 ${CELL_CLASS[kind]} ${
                          selected ? "ring-2 ring-emerald-600 ring-offset-white" : ""
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
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Close"
            onClick={() => setDetail(null)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl md:static md:mt-4 md:rounded-xl md:border md:shadow-sm"
            role="dialog"
            aria-labelledby="cal-detail-title"
          >
            <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            </div>
            <h3 id="cal-detail-title" className="text-sm font-semibold text-slate-900">
              {detailMeta.hotelName}
            </h3>
            <p className="text-xs text-slate-600">
              {detailMeta.roomTitle} · {detailMeta.checkIn} — {detailMeta.checkOut}
            </p>
            <dl className="mt-3 grid gap-1.5 text-xs text-slate-700">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{m(locale, "owner.calendar.detailGuest")}</dt>
                <dd className="font-medium">{detailMeta.guestLabel ?? "—"}</dd>
              </div>
              {detailMeta.guestPhone ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{m(locale, "owner.calendar.detailPhone")}</dt>
                  <dd className="font-medium">{detailMeta.guestPhone}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{m(locale, "owner.calendar.detailStatus")}</dt>
                <dd className="font-medium">{detailMeta.status ?? detail.kind}</dd>
              </div>
              {detailMeta.totalPrice ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{m(locale, "owner.calendar.detailAmount")}</dt>
                  <dd className="font-medium">
                    {detailMeta.totalPrice} {m(locale, "owner.calendar.currency")}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/chat/booking/${detailMeta.bookingId}`}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
              >
                {m(locale, "owner.calendar.openBooking")}
              </Link>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                {m(locale, "owner.calendar.detailClose")}
              </button>
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        .owner-cal-cell {
          min-height: 1.75rem;
          min-width: 1.75rem;
        }
        @media (min-width: 768px) {
          .owner-cal-cell {
            min-height: 1.5rem;
            min-width: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
