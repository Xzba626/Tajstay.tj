"use client";

import { useState } from "react";
import type { PropertyTypeFilter } from "@/lib/services/search";

export type SearchFiltersState = {
  q: string;
  city: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  minPrice: string;
  maxPrice: string;
  ratingMin: string;
  sortBy: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  wifi: boolean;
  breakfast: boolean;
  parking: boolean;
  propertyType: PropertyTypeFilter;
};

function asBool(value: unknown) {
  return value === true || value === "true" || value === "on" || value === "1";
}

export function useSearchFilters(initial: Record<string, unknown> = {}) {
  const [filters, setFilters] = useState<SearchFiltersState>({
    q: String(initial.q ?? ""),
    city: String(initial.city ?? ""),
    checkIn: String(initial.checkIn ?? ""),
    checkOut: String(initial.checkOut ?? ""),
    guests: String(initial.guests ?? "1"),
    minPrice: String(initial.minPrice ?? ""),
    maxPrice: String(initial.maxPrice ?? ""),
    ratingMin: String(initial.ratingMin ?? ""),
    sortBy: (initial.sortBy as SearchFiltersState["sortBy"]) ?? "POPULAR",
    wifi: asBool(initial.wifi),
    breakfast: asBool(initial.breakfast),
    parking: asBool(initial.parking),
    propertyType: (initial.propertyType as PropertyTypeFilter) ?? "ANY"
  });

  return { filters, setFilters };
}
