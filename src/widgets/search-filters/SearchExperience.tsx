"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HotelCard } from "@/components/HotelCard";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useSearchFilters } from "@/features/search-hotels/model/useSearchFilters";
import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/Modal";

const MapClient = dynamic(() => import("@/app/map/MapClient"), { ssr: false });

type HotelItem = any;

type Props = {
  initialHotels: HotelItem[];
  initialFilters: {
    q?: string;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    minPrice?: string;
    maxPrice?: string;
    ratingMin?: string;
    sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  };
  locale: string;
};

export function SearchExperience({ initialHotels, initialFilters, locale }: Props) {
  const { filters, setFilters } = useSearchFilters(initialFilters);
  const [hotels, setHotels] = useState(initialHotels);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  const [hoveredHotelId, setHoveredHotelId] = useState<number | null>(null);
  const [focusedHotelId, setFocusedHotelId] = useState<number | null>(null);
  const [previewHotel, setPreviewHotel] = useState<any | null>(null);
  const debouncedFilters = useDebounce(filters, 350);
  const cardNodesRef = useRef<Record<number, HTMLDivElement | null>>({});
  const lastQueryRef = useRef<string>("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return params.toString();
  }, [debouncedFilters]);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setLoadError(null);
      lastQueryRef.current = queryString;
      try {
        const res = await fetch(`/api/search?${queryString}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setHotels(data.hotels ?? []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setLoadError("Не удалось обновить результаты. Проверьте соединение и попробуйте снова.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run().catch(() => setLoading(false));
    return () => {
      controller.abort();
    };
  }, [queryString, retryTick]);

  useEffect(() => {
    if (!focusedHotelId) return;
    const node = cardNodesRef.current[focusedHotelId];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedHotelId]);

  const mapHotels = useMemo(
    () =>
      hotels.map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        city: hotel.city,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        fromPrice: hotel.rooms?.length ? Math.min(...hotel.rooms.map((r: any) => Number(r.price))) : 0
      })),
    [hotels]
  );

  const mobileAffordanceInput =
    "h-12 w-full rounded-2xl border border-brand-500 bg-brand-700 px-4 text-sm text-white outline-none transition placeholder:text-brand-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

  const mapHref = useMemo(() => {
    const qs = queryString ? `?${queryString}` : "";
    return `/map${qs}`;
  }, [queryString]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const { checkIn, checkOut } = filters;
    if (!checkIn || !checkOut) {
      setDateError(null);
      return;
    }
    if (checkOut <= checkIn) {
      setDateError("Дата выезда должна быть позже даты заезда.");
      return;
    }
    setDateError(null);
  }, [filters]);

  return (
    <>
      <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-[rgba(18,31,20,0.9)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:grid-cols-6">
        <input
          name="q"
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          className="ds-input w-full text-sm md:col-span-2"
          placeholder="Умный запрос: уютно, семейно, рядом с центром"
        />
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-brand-100">📍</span>
          <input
            name="city"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
            className={`${mobileAffordanceInput} pl-10`}
            placeholder="Город"
          />
        </label>
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-brand-100">📅</span>
          <input
            name="checkIn"
            value={filters.checkIn}
            onChange={(e) => setFilters((prev) => ({ ...prev, checkIn: e.target.value }))}
            className={`${mobileAffordanceInput} pl-10`}
            type="date"
            min={todayIso}
          />
        </label>
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-brand-100">📅</span>
          <input
            name="checkOut"
            value={filters.checkOut}
            onChange={(e) => setFilters((prev) => ({ ...prev, checkOut: e.target.value }))}
            className={`${mobileAffordanceInput} pl-10`}
            type="date"
            min={filters.checkIn || todayIso}
          />
        </label>
        <input name="guests" value={filters.guests} onChange={(e) => setFilters((prev) => ({ ...prev, guests: e.target.value }))} className="ds-input w-full text-sm" type="number" min={1} placeholder="Гости" />
        <input name="minPrice" value={filters.minPrice} onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))} className="ds-input w-full text-sm" type="number" min={0} placeholder="Цена от" />
        <input name="maxPrice" value={filters.maxPrice} onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))} className="ds-input w-full text-sm" type="number" min={0} placeholder="Цена до" />
        <input name="ratingMin" value={filters.ratingMin} onChange={(e) => setFilters((prev) => ({ ...prev, ratingMin: e.target.value }))} className="ds-input w-full text-sm" type="number" min={0} max={5} step={0.1} placeholder="Рейтинг >= 4.5" />
        <select name="sortBy" value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))} className="ds-input w-full text-sm">
          <option value="POPULAR">Популярные</option>
          <option value="PRICE_ASC">Дешевле</option>
          <option value="RATING_DESC">Лучшие</option>
        </select>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-brand-200" aria-live="polite">
          {loading ? "Идёт поиск…" : `Найдено вариантов: ${hotels.length}`}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-2xl border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-100 transition hover:bg-brand-700"
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                q: "",
                city: "",
                checkIn: "",
                checkOut: "",
                guests: "1",
                minPrice: "",
                maxPrice: "",
                ratingMin: "",
                sortBy: "POPULAR"
              }));
              setFocusedHotelId(null);
              setPreviewHotel(null);
            }}
          >
            Сбросить фильтры
          </button>
          <Link
            className="rounded-2xl border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-100 transition hover:bg-brand-700"
            href={mapHref}
          >
            Режим карты
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-100" role="alert">
          <div className="font-semibold">Ошибка поиска</div>
          <div className="mt-1 text-rose-100/90">{loadError}</div>
          <button
            type="button"
            className="mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 ring-1 ring-rose-400/30 transition hover:bg-rose-500/20"
            onClick={() => {
              setRetryTick((v) => v + 1);
            }}
          >
            Повторить
          </button>
        </div>
      )}
      {dateError && (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100" role="alert">
          {dateError}
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton h-72 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {!hotels.length ? (
                <div className="md:col-span-2 rounded-[2rem] border border-dashed border-slate-700/80 bg-slate-950/25 p-7 text-sm text-brand-200">
                  <div className="text-base font-semibold text-white">Ничего не найдено</div>
                  <div className="mt-2 leading-relaxed">
                    Попробуйте убрать часть фильтров, изменить город или выбрать другие даты.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
                      onClick={() => setFilters((prev) => ({ ...prev, q: "", city: "" }))}
                    >
                      Убрать текст и город
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
                      onClick={() => setFilters((prev) => ({ ...prev, minPrice: "", maxPrice: "", ratingMin: "" }))}
                    >
                      Убрать цену/рейтинг
                    </button>
                  </div>
                </div>
              ) : null}
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  ref={(node) => {
                    cardNodesRef.current[hotel.id] = node;
                  }}
                  onMouseEnter={() => setHoveredHotelId(hotel.id)}
                  onMouseLeave={() => setHoveredHotelId((prev) => (prev === hotel.id ? null : prev))}
                  role="button"
                  tabIndex={0}
                  aria-label={`Открыть предпросмотр: ${hotel.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFocusedHotelId(hotel.id);
                      setPreviewHotel(hotel);
                    }
                  }}
                  onClick={() => {
                    setFocusedHotelId(hotel.id);
                    setPreviewHotel(hotel);
                  }}
                  className={focusedHotelId === hotel.id ? "rounded-[2rem] ring-2 ring-[var(--brand-green)]/80" : ""}
                >
                  <HotelCard
                    hotel={hotel}
                    locale={locale as any}
                    variant="list"
                    hrefQuery={{
                      checkIn: filters.checkIn || undefined,
                      checkOut: filters.checkOut || undefined,
                      guests: Number(filters.guests || 1)
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
          <MapClient
            hotels={mapHotels}
            heightClass="h-[420px]"
            labels={{ fromPrice: "От", details: "Подробнее" }}
            focusedHotelId={focusedHotelId}
            highlightedHotelId={hoveredHotelId ?? focusedHotelId}
            onHotelSelect={(hotelId) => setFocusedHotelId(hotelId)}
          />
        </div>
      </div>

      <Modal
        title={previewHotel ? previewHotel.name : "Preview"}
        open={Boolean(previewHotel)}
        onClose={() => setPreviewHotel(null)}
      >
        {previewHotel ? (
          <div className="space-y-4">
            {previewHotel.coverImageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-brand-500/70">
                <img
                  src={previewHotel.coverImageUrl}
                  alt={`Фото отеля ${previewHotel.name}`}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-brand-200">{previewHotel.city}</div>
              <div className="text-sm font-semibold text-brand-100">★ {Number(previewHotel.rating).toFixed(1)}</div>
            </div>
            <div className="text-xs text-brand-200">
              🔒 Escrow · ⚡ Live search · ✅ Verified flow
            </div>
            <a
              className="ds-primary-btn inline-flex w-full items-center justify-center text-sm"
              href={`/hotel/${previewHotel.id}?checkIn=${encodeURIComponent(filters.checkIn || "")}&checkOut=${encodeURIComponent(
                filters.checkOut || ""
              )}&guests=${encodeURIComponent(filters.guests || "1")}`}
            >
              Открыть и забронировать
            </a>
          </div>
        ) : (
          <div className="text-sm text-brand-200">—</div>
        )}
      </Modal>
    </>
  );
}
