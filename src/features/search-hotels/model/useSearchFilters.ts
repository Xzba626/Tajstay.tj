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
  propertyType: PropertyTypeFilter;
  wifi: boolean;
  breakfast: boolean;
  parking: boolean;
};

export const DEFAULT_SEARCH_FILTERS: SearchFiltersState = {
  q: "",
  city: "",
  checkIn: "",
  checkOut: "",
  guests: "1",
  minPrice: "",
  maxPrice: "",
  ratingMin: "",
  sortBy: "POPULAR",
  propertyType: "ANY",
  wifi: false,
  breakfast: false,
  parking: false
};

export function useSearchFilters(initial: Partial<SearchFiltersState>) {
  const [filters, setFilters] = useState<SearchFiltersState>({
    ...DEFAULT_SEARCH_FILTERS,
    ...initial,
    guests: initial.guests ?? "1",
    sortBy: initial.sortBy ?? "POPULAR",
    propertyType: initial.propertyType ?? "ANY",
    wifi: initial.wifi ?? false,
    breakfast: initial.breakfast ?? false,
    parking: initial.parking ?? false
  });

  return { filters, setFilters };
}
