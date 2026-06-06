import { NextRequest, NextResponse } from "next/server";
import { searchApprovedHotels } from "@/lib/services/search";
import { getCityFromRequestHeaders } from "@/lib/geo/ipCity";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const nearbyCity = await getCityFromRequestHeaders(req.headers);
  const lat = Number(url.searchParams.get("lat") ?? "");
  const lng = Number(url.searchParams.get("lng") ?? "");
  const origin =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const city = url.searchParams.get("city") ?? undefined;
  const guests = Number(url.searchParams.get("guests") ?? "1");
  const minPrice = Number(url.searchParams.get("minPrice") ?? "");
  const maxPrice = Number(url.searchParams.get("maxPrice") ?? "");
  const checkIn = url.searchParams.get("checkIn") ?? undefined;
  const checkOut = url.searchParams.get("checkOut") ?? undefined;
  const sortBy = (url.searchParams.get("sortBy") as "POPULAR" | "PRICE_ASC" | "RATING_DESC" | null) ?? "POPULAR";

  const hotels = await searchApprovedHotels({
    q,
    city,
    nearbyCity: city ? undefined : nearbyCity ?? undefined,
    origin,
    guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    wifi: url.searchParams.get("wifi") === "true",
    breakfast: url.searchParams.get("breakfast") === "true",
    parking: url.searchParams.get("parking") === "true",
    ratingMin: Number.isFinite(Number(url.searchParams.get("ratingMin"))) ? Number(url.searchParams.get("ratingMin")) : undefined,
    propertyType: (url.searchParams.get("propertyType") as any) ?? "ANY",
    checkIn,
    checkOut,
    sortBy
  });

  return NextResponse.json({
    hotels,
    filters: { checkIn, checkOut, guests }
  });
}
