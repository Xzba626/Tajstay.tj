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
  hotel: { name: string };
};

type DayCol = { key: string; day: number; month: number };

const CELL_CLASS: Record<CalendarCellKind, string> = {
  available: "bg-emerald-200 hover:bg-emerald-300",
  blocked: "bg-slate-500 hover:bg-slate-600",
  customPrice: "bg-violet-400 hover:bg-violet-500",
  online: "bg-sky-500 hover:bg-sky-600",
  offline: "bg-orange-400 hover:bg-orange-500",
  onlinePending: "bg-amber-300 hover:bg-amber-400"
};

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

export function OwnerCalendar({
  locale,
  rooms,
  days,
  cells,
  cellMeta = {}
}: {
  locale: Locale;
  rooms: RoomRow[];
  days: DayCol[];
  cells: Record<string, CalendarCellKind>;
  cellMeta?: Record<string, CalendarCellMeta>;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const legend: { kind: CalendarCellKind; label: string }[] = useMemo(
    () => [
      { kind: "available", label: m(locale, "owner.calendar.legend.available") },
      { kind: "online", label: m(locale, "owner.calendar.legend.online") },
      { kind: "offline", label: m(locale, "owner.calendar.legend.offline") },
      { kind: "onlinePending", label: m(locale, "owner.calendar.legend.pending") },
      { kind: "blocked", label: m(locale, "owner.calendar.legend.blocked") },
      { kind: "customPrice", label: m(locale, "owner.calendar.legend.customPrice") }
    ],
    [locale]
  );

  const selectionLabel = useMemo(() => {
    if (!roomId || !rangeStart) return null;
    const end = rangeEnd ?? rangeStart;
    const room = rooms.find((r) => r.id === roomId);
    return `${room?.title ?? ""}: ${rangeStart}${end !== rangeStart ? ` — ${end}` : ""}`;
  }, [roomId, rangeStart, rangeEnd, rooms]);

  const onCellClick = useCallback(
    (rId: number, dayKey: string) => {
      setError(null);
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

  const selectedBookingId = useMemo(() => {
    if (!roomId || !rangeStart) return null;
    const key = `${roomId}|${rangeStart}`;
    return cellMeta[key]?.bookingId ?? null;
  }, [roomId, rangeStart, cellMeta]);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{m(locale, "owner.calendar.gridTitle")}</div>
          <p className="mt-0.5 text-xs text-slate-500">{m(locale, "owner.calendar.clickHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          {legend.map((item) => (
            <span key={item.kind} className="inline-flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded ${CELL_CLASS[item.kind].split(" ")[0]}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

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

      <div className="mt-3 overflow-x-auto rounded-xl border">
        <table className="min-w-[980px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 border-b border-r bg-slate-50 px-3 py-2 text-left text-slate-700">
                {m(locale, "owner.calendar.roomCol")}
              </th>
              {days.map((d) => (
                <th key={d.key} className="border-b border-r px-2 py-2 text-slate-600">
                  {d.day}.{String(d.month).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2">
                  <div className="font-semibold text-slate-800">{r.title}</div>
                  <div className="text-[11px] text-slate-500">{r.hotel.name}</div>
                </td>
                {days.map((d) => {
                  const key = `${r.id}|${d.key}`;
                  const kind = cells[key] ?? "available";
                  const title = legend.find((l) => l.kind === kind)?.label ?? kind;
                  const selected = roomId === r.id && inRange(d.key, rangeStart, rangeEnd, days);
                  const meta = cellMeta[key];
                  return (
                    <td key={key} className="border-b border-r px-1 py-1.5">
                      <button
                        type="button"
                        title={meta?.publicCode ? `${title} · ${meta.publicCode}` : title}
                        onClick={() => onCellClick(r.id, d.key)}
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded transition ring-offset-1 ${CELL_CLASS[kind]} ${
                          selected ? "ring-2 ring-emerald-600 ring-offset-white" : ""
                        }`}
                        aria-pressed={selected}
                        aria-label={`${r.title} ${d.key}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}