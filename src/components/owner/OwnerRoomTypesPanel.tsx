"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { AmenityCheckboxGrid } from "@/components/owner/AmenityCheckboxGrid";

type HotelOption = { id: number; name: string };
type RoomTypeRow = {
  id: number;
  name: string;
  basePrice: unknown;
  maxGuests: number;
  _count: { rooms: number };
};

export function OwnerRoomTypesPanel({
  locale,
  hotels
}: {
  locale: Locale;
  hotels: HotelOption[];
}) {
  const router = useRouter();
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? 0);
  const [types, setTypes] = useState<RoomTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/room-types?hotelId=${hotelId}`);
      const data = (await res.json()) as { roomTypes?: RoomTypeRow[] };
      setTypes(data.roomTypes ?? []);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/owner/room-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId,
        name: String(fd.get("name") ?? "").trim(),
        basePrice: Number(fd.get("basePrice") || 0),
        maxGuests: Number(fd.get("maxGuests") || 2),
        amenities
      })
    });
    if (!res.ok) {
      setMsg(m(locale, "owner.pms.createError"));
      return;
    }
    setMsg(m(locale, "owner.pms.createOk"));
    (e.target as HTMLFormElement).reset();
    setAmenities([]);
    await load();
    router.refresh();
  }

  async function bulkRooms(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const roomTypeId = Number(fd.get("roomTypeId"));
    const mode = String(fd.get("bulkMode"));
    const body: Record<string, unknown> = {
      hotelId,
      roomTypeId,
      basePrice: Number(fd.get("bulkPrice") || 0),
      capacity: Number(fd.get("bulkCapacity") || 2)
    };
    if (mode === "range") {
      body.from = Number(fd.get("from"));
      body.to = Number(fd.get("to"));
    } else {
      body.prefix = String(fd.get("prefix") ?? "").trim();
      body.count = Number(fd.get("count") || 0);
    }
    const res = await fetch("/api/owner/rooms/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = (await res.json()) as { ok?: boolean; createdCount?: number; error?: string };
    if (!res.ok || !data.ok) {
      setMsg(m(locale, "owner.pms.bulkError"));
      return;
    }
    setMsg(m(locale, "owner.pms.bulkOk", { count: String(data.createdCount ?? 0) }));
    await load();
    router.refresh();
  }

  if (!hotels.length) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-800/30 bg-emerald-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-100">{m(locale, "owner.pms.typesTitle")}</h3>
        <select
          value={hotelId}
          onChange={(e) => setHotelId(Number(e.target.value))}
          className="h-10 rounded-xl border border-white/15 bg-slate-900 px-3 text-sm text-slate-100"
        >
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {msg ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">{msg}</p>
      ) : null}

      {loading ? <p className="text-sm text-slate-400">…</p> : null}

      {types.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {types.map((rt) => (
            <li key={rt.id} className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
              <span className="font-semibold text-white">{rt.name}</span>
              <span className="text-slate-400">
                {" "}
                · {Number(rt.basePrice)} TJS · {m(locale, "owner.pms.roomsCount", { n: String(rt._count.rooms) })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">{m(locale, "owner.pms.typesEmpty")}</p>
      )}

      <details className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-200">{m(locale, "owner.pms.addType")}</summary>
        <form onSubmit={createType} className="mt-3 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder={m(locale, "owner.pms.typeNamePh")} className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white md:col-span-2" />
          <input name="basePrice" type="number" min={0} required placeholder={m(locale, "owner.priceNight")} className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <input name="maxGuests" type="number" min={1} defaultValue={2} required className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <div className="md:col-span-2">
            <AmenityCheckboxGrid locale={locale} value={amenities} onChange={setAmenities} variant="dark" />
          </div>
          <button type="submit" className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white md:col-span-2">
            {m(locale, "owner.pms.addTypeCta")}
          </button>
        </form>
      </details>

      <details className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-200">{m(locale, "owner.pms.bulkTitle")}</summary>
        <form onSubmit={bulkRooms} className="mt-3 grid gap-3 md:grid-cols-2">
          <select name="roomTypeId" required className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white md:col-span-2">
            <option value="">{m(locale, "owner.pms.pickType")}</option>
            {types.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <select name="bulkMode" defaultValue="range" className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white md:col-span-2">
            <option value="range">{m(locale, "owner.pms.bulkRange")}</option>
            <option value="prefix">{m(locale, "owner.pms.bulkPrefix")}</option>
          </select>
          <input name="from" type="number" placeholder="101" className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <input name="to" type="number" placeholder="120" className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <input name="prefix" placeholder="A-" className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <input name="count" type="number" min={1} placeholder="10" className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <input name="bulkPrice" type="number" min={0} required placeholder={m(locale, "owner.priceNight")} className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <input name="bulkCapacity" type="number" min={1} defaultValue={2} className="h-11 rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" />
          <button type="submit" className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white md:col-span-2">
            {m(locale, "owner.pms.bulkCta")}
          </button>
        </form>
      </details>
    </div>
  );
}
