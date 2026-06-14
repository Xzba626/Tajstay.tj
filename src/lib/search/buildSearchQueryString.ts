import type { SearchFiltersState } from "@/features/search-hotels/model/useSearchFilters";
import { SEARCH_DEFAULT_PAGE_SIZE } from "@/lib/services/search";

export type SearchPaginationState = {
  page?: number;
  limit?: number;
};

/** Serialize filter state to a stable query string (omits empty/default values). */
export function buildSearchQueryString(
  filters: SearchFiltersState,
  geoCoords?: { lat: number; lng: number } | null,
  pagination?: SearchPaginationState
): string {
  const params = new URLSearchParams();

  const set = (key: string, value: string | undefined | null) => {
    const v = (value ?? "").trim();
    if (v) params.set(key, v);
  };

  set("q", filters.q);
  set("city", filters.city);
  set("checkIn", filters.checkIn);
  set("checkOut", filters.checkOut);
  set("minPrice", filters.minPrice);
  set("maxPrice", filters.maxPrice);
  set("ratingMin", filters.ratingMin);

  if (filters.guests && filters.guests !== "1") params.set("guests", filters.guests);
  if (filters.sortBy && filters.sortBy !== "POPULAR") params.set("sortBy", filters.sortBy);
  if (filters.propertyType && filters.propertyType !== "ANY") params.set("propertyType", filters.propertyType);

  if (filters.wifi) params.set("wifi", "true");
  if (filters.breakfast) params.set("breakfast", "true");
  if (filters.parking) params.set("parking", "true");

  if (geoCoords) {
    params.set("lat", String(geoCoords.lat));
    params.set("lng", String(geoCoords.lng));
  }

  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? SEARCH_DEFAULT_PAGE_SIZE;
  if (page > 1) params.set("page", String(page));
  if (limit !== SEARCH_DEFAULT_PAGE_SIZE) params.set("limit", String(limit));

  return params.toString();
}

export function searchFiltersFromParams(
  params: Record<string, string | undefined>
): Partial<SearchFiltersState> {
  const bool = (v?: string) => v === "true" || v === "on" || v === "1";

  return {
    q: params.q ?? "",
    city: params.city ?? "",
    checkIn: params.checkIn ?? "",
    checkOut: params.checkOut ?? "",
    guests: params.guests ?? "1",
    minPrice: params.minPrice ?? params.priceMin ?? "",
    maxPrice: params.maxPrice ?? params.priceMax ?? "",
    ratingMin: params.ratingMin ?? "",
    sortBy: (params.sortBy as SearchFiltersState["sortBy"]) ?? "POPULAR",
    propertyType: (params.propertyType as SearchFiltersState["propertyType"]) ?? "ANY",
    wifi: bool(params.wifi),
    breakfast: bool(params.breakfast),
    parking: bool(params.parking)
  };
}
