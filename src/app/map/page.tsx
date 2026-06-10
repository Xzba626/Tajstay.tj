import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { searchHotels, type PropertyTypeFilter } from "@/lib/services/search";
import { getCityFromRequestHeaders } from "@/lib/geo/ipCity";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false
});

type MapSearchParams = {
  q?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  minPrice?: string;
  maxPrice?: string;
  priceMin?: string;
  priceMax?: string;
  guests?: string;
  rating?: string;
  ratingMin?: string;
  propertyType?: PropertyTypeFilter;
  wifi?: string;
  breakfast?: string;
  parking?: string;
  sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
};

export default async function MapPage({ searchParams }: { searchParams?: MapSearchParams }) {
  const locale = getLocale();
  const params = searchParams ?? {};
  const hdrs = headers();
  const nearbyCity = params.city ? null : await getCityFromRequestHeaders(hdrs);

  const minPriceRaw = params.minPrice ?? params.priceMin;
  const maxPriceRaw = params.maxPrice ?? params.priceMax;
  const ratingRaw = params.ratingMin ?? params.rating;

  const hotels = await searchHotels({
    q: params.q,
    city: params.city,
    nearbyCity: nearbyCity ?? undefined,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests ? Number(params.guests) : undefined,
    minPrice: minPriceRaw ? Number(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
    ratingMin: ratingRaw ? Number(ratingRaw) : undefined,
    propertyType: params.propertyType ?? "ANY",
    wifi: params.wifi === "on" || params.wifi === "true",
    breakfast: params.breakfast === "on" || params.breakfast === "true",
    parking: params.parking === "on" || params.parking === "true",
    sortBy: params.sortBy ?? "POPULAR"
  });

  const mapHotels = hotels.map((hotel) => {
    const fromPrice = hotel.rooms.length ? Math.min(...hotel.rooms.map((r) => Number(r.price))) : 0;
    return {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      fromPrice
    };
  });

  const hasFilters = Boolean(
    params.city ||
      params.checkIn ||
      params.checkOut ||
      minPriceRaw ||
      maxPriceRaw ||
      params.guests ||
      ratingRaw ||
      (params.propertyType && params.propertyType !== "ANY")
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">{m(locale, "search.mapMode")}</h1>
      <p className="text-sm text-slate-500">
        {hasFilters
          ? `Найдено объектов: ${mapHotels.length}`
          : m(locale, "admin.moderateHotels")}
      </p>
      {!mapHotels.length && (
        <div className="glass-panel rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-slate-300">
          {m(locale, "admin.emptyResults")}
          <p className="mt-2 text-sm text-slate-400">{m(locale, "admin.emptyResultsHint")}</p>
        </div>
      )}
      <MapClient
        hotels={mapHotels}
        labels={{ fromPrice: m(locale, "search.fromPrice"), details: m(locale, "search.details") }}
      />
    </div>
  );
}
