import { NextRequest, NextResponse } from "next/server";
import { searchApprovedHotelsPaginated } from "@/lib/services/search";
import { getCityFromRequestHeaders } from "@/lib/geo/ipCity";
import { parseSearchParams, parsedSearchToServiceInput } from "@/lib/search/parseSearchParams";

export async function GET(req: NextRequest) {
  const nearbyCity = await getCityFromRequestHeaders(req.headers);
  const parsed = parseSearchParams(req.nextUrl.searchParams);

  const result = await searchApprovedHotelsPaginated(
    parsedSearchToServiceInput(parsed, {
      nearbyCity: parsed.city ? null : nearbyCity
    })
  );

  return NextResponse.json({
    hotels: result.hotels,
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
    filters: {
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      guests: parsed.guests
    }
  });
}
