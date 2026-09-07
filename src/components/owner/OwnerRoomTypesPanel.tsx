"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { AMENITY_CATEGORIES } from "@/lib/pms/amenities";

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

  function toggleAmenity(id: string) {
    setAmenities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!hotels.length) return null;

  return (
    <div className="owner-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="owner-panel__title">{m(locale, "owner.pms.typesTitle")}</h3>
        <select value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))} className="owner-select max-w-xs">
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {msg ? <p className="owner-status-banner owner-status-banner--success">{msg}</p> : null}

      {loading ? <p className="owner-section-lead">…</p> : null}

      {types.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {types.map((rt) => (
            <li key={rt.id} className="owner-record-card text-sm">
              <span className="owner-record-card__title">{rt.name}</span>
              <span className="owner-record-card__meta">
                {" "}
                · {Number(rt.basePrice)} TJS · {m(locale, "owner.pms.roomsCount", { n: String(rt._count.rooms) })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="owner-section-lead">{m(locale, "owner.pms.typesEmpty")}</p>
      )}

      <details className="owner-form__section">
        <summary className="owner-form__section-title cursor-pointer list-none">{m(locale, "owner.pms.addType")}</summary>
        <form onSubmit={createType} className="owner-form owner-form--grid-2 mt-3">
          <input
            name="name"
            required
            placeholder={m(locale, "owner.pms.typeNamePh")}
            className="owner-input md:col-span-2"
          />
          <input
            name="basePrice"
            type="number"
            min={0}
            required
            placeholder={m(locale, "owner.priceNight")}
            className="owner-input"
          />
          <input name="maxGuests" type="number" min={1} defaultValue={2} required className="owner-input" />
          <div className="md:col-span-2 space-y-2">
            <p className="owner-field__label owner-field__label--caps">{m(locale, "owner.amenities")}</p>
            {Object.entries(AMENITY_CATEGORIES).map(([key, cat]) => (
              <div key={key}>
                <p className="owner-field__hint">{cat.label.ru}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <label key={item} className="flex items-center gap-1 text-xs owner-section-lead">
                      <input type="checkbox" checked={amenities.includes(item)} onChange={() => toggleAmenity(item)} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="owner-btn owner-btn--primary md:col-span-2">
            {m(locale, "owner.pms.addTypeCta")}
          </button>
        </form>
      </details>

      <details className="owner-form__section">
        <summary className="owner-form__section-title cursor-pointer list-none">{m(locale, "owner.pms.bulkTitle")}</summary>
        <form onSubmit={bulkRooms} className="owner-form owner-form--grid-2 mt-3">
          <select name="roomTypeId" required className="owner-select md:col-span-2">
            <option value="">{m(locale, "owner.pms.pickType")}</option>
            {types.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <select name="bulkMode" defaultValue="range" className="owner-select md:col-span-2">
            <option value="range">{m(locale, "owner.pms.bulkRange")}</option>
            <option value="prefix">{m(locale, "owner.pms.bulkPrefix")}</option>
          </select>
          <input name="from" type="number" placeholder="101" className="owner-input" />
          <input name="to" type="number" placeholder="120" className="owner-input" />
          <input name="prefix" placeholder="A-" className="owner-input" />
          <input name="count" type="number" min={1} placeholder="10" className="owner-input" />
          <input
            name="bulkPrice"
            type="number"
            min={0}
            required
            placeholder={m(locale, "owner.priceNight")}
            className="owner-input"
          />
          <input name="bulkCapacity" type="number" min={1} defaultValue={2} className="owner-input" />
          <button type="submit" className="owner-btn owner-btn--primary md:col-span-2">
            {m(locale, "owner.pms.bulkCta")}
          </button>
        </form>
      </details>
    </div>
  );
}
