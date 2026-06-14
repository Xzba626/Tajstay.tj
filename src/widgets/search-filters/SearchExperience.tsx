"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HotelCard } from "@/components/HotelCard";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
  DEFAULT_SEARCH_FILTERS,
  useSearchFilters,
  type SearchFiltersState
} from "@/features/search-hotels/model/useSearchFilters";
import { buildSearchQueryString } from "@/lib/search/buildSearchQueryString";
import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/Modal";
import { AppImage } from "@/components/ui/AppImage";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

const MapClient = dynamic(() => import("@/app/map/MapClient"), { ssr: false });

type HotelItem = any;

type Props = {
  initialHotels: HotelItem[];
  initialFilters: Partial<SearchFiltersState>;
  locale: Locale;
  nearbyCity?: string | null;
};

function amenityToggleClass(active: boolean) {
  return active
    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-50"
    : "border-white/12 bg-white/5 text-brand-200 hover:bg-white/10";
}

export function SearchExperience({ initialHotels, initialFilters, locale, nearbyCity = null }: Props) {
  const router = useRouter();
  const { filters, setFilters } = useSearchFilters(initialFilters);
  const [hotels, setHotels] = useState(initialHotels);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  const [hoveredHotelId, setHoveredHotelId] = useState<number | null>(null);
  const [focusedHotelId, setFocusedHotelId] = useState<number | null>(null);
  const [previewHotel, setPreviewHotel] = useState<any | null>(null);
  const debouncedFilters = useDebounce(filters, 350);
  const cardNodesRef = useRef<Record<number, HTMLDivElement | null>>({});
  const initialQueryRef = useRef(
    buildSearchQueryString({ ...DEFAULT_SEARCH_FILTERS, ...initialFilters })
  );
  const skipNextFetchRef = useRef(true);

  const queryString = useMemo(
    () => buildSearchQueryString(debouncedFilters, geoCoords),
    [debouncedFilters, geoCoords]
  );

  const datesInvalid = Boolean(
    debouncedFilters.checkIn && debouncedFilters.checkOut && debouncedFilters.checkOut <= debouncedFilters.checkIn
  );

  useEffect(() => {
    if (datesInvalid) return;
    const target = queryString ? `?${queryString}` : "";
    const current = window.location.search;
    if (target !== current) {
      router.replace(`/search${target}`, { scroll: false });
    }
  }, [queryString, datesInvalid, router]);

  useEffect(() => {
    if (datesInvalid) return;

    if (skipNextFetchRef.current && queryString === initialQueryRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    skipNextFetchRef.current = false;

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const qs = queryString ? `?${queryString}` : "";
        const res = await fetch(`/api/search${qs}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHotels(data.hotels ?? []);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setLoadError(m(locale, "search.loadErrorBody"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void run();
    return () => controller.abort();
  }, [queryString, retryTick, datesInvalid, locale]);

  useEffect(() => {
    if (!focusedHotelId) return;
    const node = cardNodesRef.current[focusedHotelId];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    "h-12 w-full min-w-0 rounded-2xl border border-brand-500 bg-brand-700 px-4 text-sm text-white outline-none transition placeholder:text-brand-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

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
      setDateError(m(locale, "search.errDates"));
      return;
    }
    setDateError(null);
  }, [filters, locale]);

  function resetFilters() {
    setFilters({ ...DEFAULT_SEARCH_FILTERS });
    setGeoCoords(null);
    setGeoError(null);
    setFocusedHotelId(null);
    setPreviewHotel(null);
  }

  const showSkeleton = loading && hotels.length === 0;

  return (
    <>
      <div className="grid min-w-0 gap-3 overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(18,31,20,0.9)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:grid-cols-6">
        <input
          name="q"
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          className="ds-input w-full min-w-0 text-sm md:col-span-2"
          placeholder={m(locale, "search.smartQueryPh")}
        />
        <label className="relative block min-w-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-brand-100">📍</span>
          <input
            name="city"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
            className={`${mobileAffordanceInput} pl-10`}
            placeholder={m(locale, "search.city")}
          />
        </label>
        <label className="relative block min-w-0">
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
        <label className="relative block min-w-0">
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
        <input
          name="guests"
          value={filters.guests}
          onChange={(e) => setFilters((prev) => ({ ...prev, guests: e.target.value }))}
          className="ds-input w-full min-w-0 text-sm"
          type="number"
          min={1}
          placeholder={m(locale, "search.guests")}
        />
        <input
          name="minPrice"
          value={filters.minPrice}
          onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
          className="ds-input w-full min-w-0 text-sm"
          type="number"
          min={0}
          placeholder={m(locale, "search.priceFrom")}
        />
        <input
          name="maxPrice"
          value={filters.maxPrice}
          onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
          className="ds-input w-full min-w-0 text-sm"
          type="number"
          min={0}
          placeholder={m(locale, "search.priceTo")}
        />
        <input
          name="ratingMin"
          value={filters.ratingMin}
          onChange={(e) => setFilters((prev) => ({ ...prev, ratingMin: e.target.value }))}
          className="ds-input w-full min-w-0 text-sm"
          type="number"
          min={0}
          max={5}
          step={0.1}
          placeholder={m(locale, "search.ratingFrom")}
        />
        <select
          name="propertyType"
          value={filters.propertyType}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, propertyType: e.target.value as SearchFiltersState["propertyType"] }))
          }
          className="ds-input w-full min-w-0 text-sm"
        >
          <option value="ANY">{m(locale, "search.typeAny")}</option>
          <option value="HOTEL">{m(locale, "search.typeHotel")}</option>
          <option value="HOSTEL">{m(locale, "search.typeHostel")}</option>
          <option value="GUEST_HOUSE">{m(locale, "search.typeGuestHouse")}</option>
          <option value="APARTMENT">{m(locale, "search.typeApartment")}</option>
          <option value="ECO_HOUSE">{m(locale, "search.typeEcoHouse")}</option>
        </select>
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, sortBy: e.target.value as SearchFiltersState["sortBy"] }))
          }
          className="ds-input w-full min-w-0 text-sm"
        >
          <option value="POPULAR">{m(locale, "search.sortPopular")}</option>
          <option value="PRICE_ASC">{m(locale, "search.sortPriceAsc")}</option>
          <option value="RATING_DESC">{m(locale, "search.sortRatingDesc")}</option>
        </select>
        <div className="flex min-w-0 flex-wrap gap-2 md:col-span-6">
          {(
            [
              ["wifi", "search.amenityWifi"],
              ["breakfast", "search.amenityBreakfast"],
              ["parking", "search.amenityParking"]
            ] as const
          ).map(([key, labelKey]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filters[key]}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${amenityToggleClass(filters[key])}`}
              onClick={() => setFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {m(locale, labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-brand-200" aria-live="polite">
          {loading ? m(locale, "search.loading") : m(locale, "search.foundCount", { count: hotels.length })}
          {nearbyCity && !filters.city && !geoCoords ? (
            <span className="mt-1 block text-xs text-emerald-200/90">
              {m(locale, "searchGeo.nearbyHint", { city: nearbyCity })}
            </span>
          ) : null}
          {geoError ? (
            <span className="mt-1 block text-xs text-amber-200/90" role="alert">
              {geoError}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!filters.city ? (
            <button
              type="button"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              onClick={() => {
                setGeoError(null);
                if (!navigator.geolocation) {
                  setGeoError(m(locale, "searchGeo.locationDenied"));
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  () => setGeoError(m(locale, "searchGeo.locationDenied")),
                  { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 }
                );
              }}
            >
              {m(locale, "searchGeo.useMyLocation")}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-2xl border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-100 transition hover:bg-brand-700"
            onClick={resetFilters}
          >
            {m(locale, "search.resetFilters")}
          </button>
          <Link
            className="rounded-2xl border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-100 transition hover:bg-brand-700"
            href={mapHref}
          >
            {m(locale, "search.mapMode")}
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-100" role="alert">
          <div className="font-semibold">{m(locale, "search.loadErrorTitle")}</div>
          <div className="mt-1 text-rose-100/90">{loadError}</div>
          <button
            type="button"
            className="mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 ring-1 ring-rose-400/30 transition hover:bg-rose-500/20"
            onClick={() => setRetryTick((v) => v + 1)}
          >
            {m(locale, "search.retry")}
          </button>
        </div>
      ) : null}
      {dateError ? (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100" role="alert">
          {dateError}
        </div>
      ) : null}
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          {showSkeleton ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton h-72 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-4 md:grid-cols-2 ${loading ? "opacity-80" : ""}`}>
              {!hotels.length ? (
                <div className="md:col-span-2 rounded-[2rem] border border-dashed border-slate-700/80 bg-slate-950/25 p-7 text-sm text-brand-200">
                  <div className="text-base font-semibold text-white">{m(locale, "search.emptyTitle")}</div>
                  <div className="mt-2 leading-relaxed">{m(locale, "search.emptyHint")}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
                      onClick={() => setFilters((prev) => ({ ...prev, q: "", city: "" }))}
                    >
                      {m(locale, "search.clearTextCity")}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, minPrice: "", maxPrice: "", ratingMin: "" }))
                      }
                    >
                      {m(locale, "search.clearPriceRating")}
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
                  aria-label={m(locale, "search.openPreview", { name: hotel.name })}
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
                  className={`min-w-0 ${focusedHotelId === hotel.id ? "rounded-[2rem] ring-2 ring-[var(--brand-green)]/80" : ""}`}
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
        <div className="min-w-0 lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
          <MapClient
            hotels={mapHotels}
            heightClass="h-[420px]"
            labels={{ fromPrice: m(locale, "search.fromPrice"), details: m(locale, "search.details") }}
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
              <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-brand-500/70">
                <AppImage
                  src={previewHotel.coverImageUrl}
                  alt={previewHotel.name}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-brand-200">{previewHotel.city}</div>
              <div className="text-sm font-semibold text-brand-100">★ {Number(previewHotel.rating).toFixed(1)}</div>
            </div>
            <a
              className="ds-primary-btn inline-flex w-full items-center justify-center text-sm"
              href={`/hotel/${previewHotel.id}?checkIn=${encodeURIComponent(filters.checkIn || "")}&checkOut=${encodeURIComponent(
                filters.checkOut || ""
              )}&guests=${encodeURIComponent(filters.guests || "1")}`}
            >
              {m(locale, "search.openAndBook")}
            </a>
          </div>
        ) : (
          <div className="text-sm text-brand-200">—</div>
        )}
      </Modal>
    </>
  );
}
