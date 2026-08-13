import { NextRequest, NextResponse } from "next/server";
import { searchApprovedHotels } from "@/lib/services/search";

function parseOptionalNumber(raw: string | null): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const q = url.searchParams.get("q") ?? undefined;
  const city = url.searchParams.get("city") ?? undefined;
  const guests = Number(url.searchParams.get("guests") ?? "1");
  const minPrice = parseOptionalNumber(url.searchParams.get("minPrice"));
  const maxPrice = parseOptionalNumber(url.searchParams.get("maxPrice"));
  const ratingMin = parseOptionalNumber(url.searchParams.get("ratingMin"));
  const checkIn = url.searchParams.get("checkIn") ?? undefined;
  const checkOut = url.searchParams.get("checkOut") ?? undefined;
  const sortBy = (url.searchParams.get("sortBy") as "POPULAR" | "PRICE_ASC" | "RATING_DESC" | null) ?? "POPULAR";

  const hotels = await searchApprovedHotels({
    q,
    city,
    guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
    minPrice,
    maxPrice,
    wifi: url.searchParams.get("wifi") === "true",
    breakfast: url.searchParams.get("breakfast") === "true",
    parking: url.searchParams.get("parking") === "true",
    ratingMin,
    propertyType: (url.searchParams.get("propertyType") as any) ?? "ANY",
    sortBy
  });

  return NextResponse.json({
    hotels,
    filters: { checkIn, checkOut, guests }
  });
}
