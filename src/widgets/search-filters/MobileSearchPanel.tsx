"use client";

import { useRef, useState, type ReactNode } from "react";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { HotelCard } from "@/components/HotelCard";
import type { SearchFiltersState } from "@/features/search-hotels/model/useSearchFilters";
import type { PropertyTypeFilter } from "@/lib/services/search";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import dynamic from "next/dynamic";
import type { MapHotel, MapUserLocation } from "@/app/map/MapClient";

const MapClient = dynamic(() => import("@/app/map/MapClient"), { ssr: false });

type HotelItem = {
  id: number;
  name: string;
  city: string;
  rating: number;
  description?: string | null;
  rooms: Array<{ price: unknown; availability: boolean; amenities?: string }>;
};

type Props = {
  hotels: HotelItem[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  filters: SearchFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<SearchFiltersState>>;
  locale: Locale;
  mapHotels: MapHotel[];
  afterHotels?: ReactNode;
};

const PROPERTY_TYPES: Array<{ value: PropertyTypeFilter; labelKey: string }> = [
  { value: "ANY", labelKey: "search.propertyAny" },
  { value: "HOTEL", labelKey: "search.propertyHotel" },
  { value: "HOSTEL", labelKey: "search.propertyHostel" },
  { value: "GUEST_HOUSE", labelKey: "search.propertyGuestHouse" },
  { value: "APARTMENT", labelKey: "search.propertyApartment" },
  { value: "ECO_HOUSE", labelKey: "search.propertyEcoHouse" }
];

export function MobileSearchPanel({
  hotels,
  loading,
  loadError,
  onRetry,
  filters,
  setFilters,
  locale,
  mapHotels,
  afterHotels
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [draftQ, setDraftQ] = useState(filters.q);
  const [userLocation, setUserLocation] = useState<MapUserLocation | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const swipeStartY = useRef<number | null>(null);

  function applyQuery() {
    setFilters((prev) => ({ ...prev, q: draftQ.trim() }));
  }

  function requestLocation(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) setGeoError(m(locale, "search.geoUnsupported"));
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        if (!silent) setGeoError(m(locale, "search.geoDenied"));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="mobile-search-bar">
        <Search size={18} className="shrink-0 text-brand-100" aria-hidden />
        <input
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyQuery();
          }}
          className="mobile-search-bar__input"
          placeholder={m(locale, "search.placeholderQuery")}
          aria-label={m(locale, "search.search")}
        />
        <button type="button" className="mobile-search-bar__go" onClick={applyQuery}>
          {m(locale, "search.search")}
        </button>
        <button
          type="button"
          className="mobile-search-bar__filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={18} aria-hidden />
          <span className="sr-only">{m(locale, "search.filters")}</span>
        </button>
      </div>

      {filtersOpen ? (
        <div className="mobile-search-filters">
          <div className="grid grid-cols-2 gap-2">
            <label className="mobile-search-filters__field">
              <span>{m(locale, "search.priceFrom")}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
              />
            </label>
            <label className="mobile-search-filters__field">
              <span>{m(locale, "search.priceTo")}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
              />
            </label>
            <label className="mobile-search-filters__field">
              <span>{m(locale, "search.ratingFrom")}</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                inputMode="decimal"
                value={filters.ratingMin}
                onChange={(e) => setFilters((prev) => ({ ...prev, ratingMin: e.target.value }))}
              />
            </label>
            <label className="mobile-search-filters__field">
              <span>{m(locale, "search.guests")}</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={filters.guests}
                onChange={(e) => setFilters((prev) => ({ ...prev, guests: e.target.value }))}
              />
            </label>
          </div>

          <label className="mobile-search-filters__field mt-2">
            <span>{m(locale, "search.city")}</span>
            <input
              value={filters.city}
              onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
              placeholder={m(locale, "search.placeholder")}
            />
          </label>

          <label className="mobile-search-filters__field mt-2">
            <span>{m(locale, "search.propertyType")}</span>
            <select
              value={filters.propertyType}
              onChange={(e) => setFilters((prev) => ({ ...prev, propertyType: e.target.value as PropertyTypeFilter }))}
            >
              {PROPERTY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {m(locale, item.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="mobile-search-filters__field mt-2">
            <span>{m(locale, "search.sortBy")}</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as SearchFiltersState["sortBy"] }))}
            >
              <option value="POPULAR">{m(locale, "search.sortPopular")}</option>
              <option value="PRICE_ASC">{m(locale, "search.sortPrice")}</option>
              <option value="RATING_DESC">{m(locale, "search.sortRating")}</option>
            </select>
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["wifi", "search.wifi"],
                ["breakfast", "search.breakfast"],
                ["parking", "search.parking"]
              ] as const
            ).map(([key, labelKey]) => (
              <button
                key={key}
                type="button"
                className={`mobile-search-chip ${filters[key] ? "is-on" : ""}`}
                onClick={() => setFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                {m(locale, labelKey)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="mobile-search-filters__reset"
              onClick={() => {
                setDraftQ("");
                setFilters((prev) => ({
                  ...prev,
                  q: "",
                  city: "",
                  minPrice: "",
                  maxPrice: "",
                  ratingMin: "",
                  guests: "1",
                  wifi: false,
                  breakfast: false,
                  parking: false,
                  propertyType: "ANY",
                  sortBy: "POPULAR"
                }));
              }}
            >
              {m(locale, "search.resetFilters")}
            </button>
            <button
              type="button"
              className="mobile-search-filters__apply"
              onClick={() => {
                applyQuery();
                setFiltersOpen(false);
              }}
            >
              {m(locale, "search.applyFilters")}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="mobile-search-map-cta"
        onClick={() => {
          setMapOpen(true);
          requestLocation(true);
        }}
      >
        <MapPin size={16} aria-hidden />
        {m(locale, "search.showMap")}
      </button>

      <div className="text-xs text-brand-200" aria-live="polite">
        {loading ? m(locale, "search.searching") : m(locale, "search.foundCount", { count: hotels.length })}
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-950/30 px-3 py-3 text-sm text-rose-100" role="alert">
          <div>{loadError}</div>
          <button type="button" className="mt-2 text-xs font-semibold underline" onClick={onRetry}>
            {m(locale, "search.retry")}
          </button>
        </div>
      ) : null}

      {hotels.length ? (
        <div className="grid grid-cols-2 gap-2.5">
          {hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel as any}
              locale={locale}
              variant="compact"
              hrefQuery={{
                checkIn: filters.checkIn || undefined,
                checkOut: filters.checkOut || undefined,
                guests: Number(filters.guests || 1)
              }}
            />
          ))}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
          <div className="font-semibold text-white">{m(locale, "search.emptyTitle")}</div>
          <p className="mt-2 text-sm text-brand-200">{m(locale, "search.emptyHint")}</p>
        </div>
      )}

      {afterHotels}

      {mapOpen ? (
        <div className="mobile-map-overlay" role="dialog" aria-modal="true" aria-label={m(locale, "search.mapMode")}>
          <div
            className="mobile-map-overlay__header"
            onTouchStart={(e) => {
              swipeStartY.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(e) => {
              if (swipeStartY.current == null) return;
              const dy = (e.touches[0]?.clientY ?? 0) - swipeStartY.current;
              if (dy > 88) {
                swipeStartY.current = null;
                setMapOpen(false);
              }
            }}
          >
            <div className="mobile-map-overlay__handle" />
            <button type="button" className="mobile-map-overlay__close" onClick={() => setMapOpen(false)} aria-label={m(locale, "common.close")}>
              <X size={20} />
            </button>
            <button type="button" className="mobile-map-overlay__geo" onClick={requestLocation}>
              {m(locale, "search.nearMe")}
            </button>
          </div>
          {geoError ? <div className="px-4 pb-2 text-xs text-amber-100">{geoError}</div> : null}
          <div className="mobile-map-overlay__map">
            <MapClient
              hotels={mapHotels}
              heightClass="h-full"
              chrome="plain"
              userLocation={userLocation}
              labels={{ fromPrice: m(locale, "search.fromPrice"), details: m(locale, "search.details") }}
            />
          </div>
        </div>
      ) : null}

    </div>
  );
}
