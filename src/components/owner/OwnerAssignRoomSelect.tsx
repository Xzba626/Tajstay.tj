"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type RoomOption = { id: number; title: string; roomNumber?: string | null };

export function OwnerAssignRoomSelect({
  locale,
  bookingId,
  roomTypeId,
  rooms,
  assignedRoomId
}: {
  locale: Locale;
  bookingId: number;
  roomTypeId: number | null;
  rooms: RoomOption[];
  assignedRoomId?: number | null;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(assignedRoomId ? String(assignedRoomId) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = rooms;

  async function assign() {
    if (!roomId) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/owner/bookings/${bookingId}/assign-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: Number(roomId) })
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? m(locale, "owner.pms.assignError"));
      return;
    }
    router.refresh();
  }

  if (!roomTypeId && assignedRoomId) return null;

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="min-w-[12rem] flex-1">
        <label className="mb-1 block text-xs font-semibold text-slate-600">{m(locale, "owner.pms.assignRoom")}</label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm"
        >
          <option value="">{m(locale, "owner.pms.unassigned")}</option>
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {r.roomNumber ? `${r.roomNumber} · ` : ""}
              {r.title}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={busy || !roomId}
        onClick={() => void assign()}
        className="h-10 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "…" : m(locale, "owner.pms.assignCta")}
      </button>
      {error ? <p className="w-full text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
