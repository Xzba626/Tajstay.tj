"use client";

import { useState } from "react";

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
};

export function useSearchFilters(initial: Partial<SearchFiltersState>) {
  const [filters, setFilters] = useState<SearchFiltersState>({
    q: initial.q ?? "",
    city: initial.city ?? "",
    checkIn: initial.checkIn ?? "",
    checkOut: initial.checkOut ?? "",
    guests: initial.guests ?? "1",
    minPrice: initial.minPrice ?? "",
    maxPrice: initial.maxPrice ?? "",
    ratingMin: initial.ratingMin ?? "",
    sortBy: initial.sortBy ?? "POPULAR"
  });

  return { filters, setFilters };
}
