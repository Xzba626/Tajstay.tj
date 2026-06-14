import { NextRequest, NextResponse } from "next/server";
import { searchApprovedHotels } from "@/lib/services/search";
import { getCityFromRequestHeaders } from "@/lib/geo/ipCity";
import { parseSearchParams, parsedSearchToServiceInput } from "@/lib/search/parseSearchParams";

export async function GET(req: NextRequest) {
  const nearbyCity = await getCityFromRequestHeaders(req.headers);
  const parsed = parseSearchParams(req.nextUrl.searchParams);

  const hotels = await searchApprovedHotels(
    parsedSearchToServiceInput(parsed, {
      nearbyCity: parsed.city ? null : nearbyCity
    })
  );

  return NextResponse.json({
    hotels,
    filters: {
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      guests: parsed.guests
    }
  });
}
