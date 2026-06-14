import type { PropertyTypeFilter } from "@/lib/services/search";
import { SEARCH_DEFAULT_PAGE_SIZE, SEARCH_MAX_PAGE_SIZE } from "@/lib/services/search";

export type SearchUrlParams = {
  q?: string;
  city?: string;
  guests?: string;
  minPrice?: string;
  maxPrice?: string;
  checkIn?: string;
  checkOut?: string;
  wifi?: string;
  breakfast?: string;
  parking?: string;
  ratingMin?: string;
  propertyType?: PropertyTypeFilter;
  sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  lat?: string;
  lng?: string;
  page?: string;
  limit?: string;
};

export type ParsedSearchQuery = {
  q?: string;
  city?: string;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
  checkIn?: string;
  checkOut?: string;
  wifi: boolean;
  breakfast: boolean;
  parking: boolean;
  ratingMin?: number;
  propertyType: PropertyTypeFilter;
  sortBy: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  origin?: { lat: number; lng: number };
  page: number;
  limit: number;
};

const PROPERTY_TYPES = new Set<PropertyTypeFilter>([
  "ANY",
  "HOTEL",
  "HOSTEL",
  "GUEST_HOUSE",
  "APARTMENT",
  "ECO_HOUSE"
]);

function parseOptionalNumber(raw: string | null | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolFlag(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "on" || v === "1";
}

function parseSortBy(raw: string | null | undefined): ParsedSearchQuery["sortBy"] {
  if (raw === "PRICE_ASC" || raw === "RATING_DESC" || raw === "POPULAR") return raw;
  return "POPULAR";
}

function parsePropertyType(raw: string | null | undefined): PropertyTypeFilter {
  const code = (raw ?? "ANY").toUpperCase() as PropertyTypeFilter;
  return PROPERTY_TYPES.has(code) ? code : "ANY";
}

/** Parse URLSearchParams or a plain record (Next.js searchParams). */
export function parseSearchParams(input: URLSearchParams | Record<string, string | undefined>): ParsedSearchQuery {
  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) {
      const v = input.get(key);
      return v === null ? undefined : v;
    }
    return input[key];
  };

  const minRaw = get("minPrice") ?? get("priceMin");
  const maxRaw = get("maxPrice") ?? get("priceMax");
  const guestsRaw = parseOptionalNumber(get("guests"));
  const ratingRaw = parseOptionalNumber(get("ratingMin"));
  const lat = parseOptionalNumber(get("lat"));
  const lng = parseOptionalNumber(get("lng"));

  const origin =
    lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;

  const pageRaw = parseOptionalNumber(get("page"));
  const limitRaw = parseOptionalNumber(get("limit"));
  const page = pageRaw != null && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit =
    limitRaw != null && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), SEARCH_MAX_PAGE_SIZE)
      : SEARCH_DEFAULT_PAGE_SIZE;

  return {
    q: get("q")?.trim() || undefined,
    city: get("city")?.trim() || undefined,
    guests: guestsRaw != null && guestsRaw > 0 ? Math.floor(guestsRaw) : 1,
    minPrice: minRaw != null && minRaw !== "" ? parseOptionalNumber(minRaw) : undefined,
    maxPrice: maxRaw != null && maxRaw !== "" ? parseOptionalNumber(maxRaw) : undefined,
    checkIn: get("checkIn")?.trim() || undefined,
    checkOut: get("checkOut")?.trim() || undefined,
    wifi: parseBoolFlag(get("wifi")),
    breakfast: parseBoolFlag(get("breakfast")),
    parking: parseBoolFlag(get("parking")),
    ratingMin: ratingRaw != null && ratingRaw > 0 ? ratingRaw : undefined,
    propertyType: parsePropertyType(get("propertyType")),
    sortBy: parseSortBy(get("sortBy")),
    origin,
    page,
    limit
  };
}

export function parsedSearchToServiceInput(
  parsed: ParsedSearchQuery,
  opts?: { nearbyCity?: string | null }
) {
  return {
    q: parsed.q,
    city: parsed.city,
    nearbyCity: parsed.city ? undefined : opts?.nearbyCity ?? undefined,
    origin: parsed.origin,
    guests: parsed.guests,
    minPrice: parsed.minPrice,
    maxPrice: parsed.maxPrice,
    wifi: parsed.wifi,
    breakfast: parsed.breakfast,
    parking: parsed.parking,
    ratingMin: parsed.ratingMin,
    propertyType: parsed.propertyType,
    checkIn: parsed.checkIn,
    checkOut: parsed.checkOut,
    sortBy: parsed.sortBy,
    page: parsed.page,
    limit: parsed.limit
  };
}
