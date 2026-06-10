import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { searchApprovedHotels, type PropertyTypeFilter } from "@/lib/services/search";
import { getCityFromRequestHeaders, sortHotelsByNearbyCity } from "@/lib/geo/ipCity";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false
});

type MapSearchParams = {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  priceMin?: string;
  priceMax?: string;
  minPrice?: string;
  maxPrice?: string;
  guests?: string;
  rating?: string;
  ratingMin?: string;
  q?: string;
  propertyType?: PropertyTypeFilter;
  wifi?: string;
  breakfast?: string;
  parking?: string;
  sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
};

export default async function MapPage({ searchParams }: { searchParams?: MapSearchParams }) {
  const locale = getLocale();
  const hdrs = headers();
  const nearbyCity = searchParams?.city ? null : await getCityFromRequestHeaders(hdrs);

  const minRaw = searchParams?.minPrice ?? searchParams?.priceMin;
  const maxRaw = searchParams?.maxPrice ?? searchParams?.priceMax;
  const minPrice = minRaw && Number.isFinite(Number(minRaw)) ? Number(minRaw) : undefined;
  const maxPrice = maxRaw && Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : undefined;
  const ratingRaw = searchParams?.ratingMin ?? searchParams?.rating;
  const ratingMin = ratingRaw && Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : undefined;

  const hotelsRaw = await searchApprovedHotels({
    q: searchParams?.q,
    city: searchParams?.city,
    nearbyCity: nearbyCity ?? undefined,
    guests: searchParams?.guests ? Number(searchParams.guests) : 1,
    minPrice,
    maxPrice,
    propertyType: searchParams?.propertyType ?? "ANY",
    wifi: searchParams?.wifi === "on" || searchParams?.wifi === "true",
    breakfast: searchParams?.breakfast === "on" || searchParams?.breakfast === "true",
    parking: searchParams?.parking === "on" || searchParams?.parking === "true",
    ratingMin,
    checkIn: searchParams?.checkIn,
    checkOut: searchParams?.checkOut,
    sortBy: searchParams?.sortBy ?? "POPULAR"
  });

  const hotels = sortHotelsByNearbyCity(hotelsRaw, nearbyCity);

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
        {mapHotels.length} {m(locale, "admin.hotelsTotal").toLowerCase()}
        {searchParams?.city ? ` · ${searchParams.city}` : ""}
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
