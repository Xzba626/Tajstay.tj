import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getHotelAnalytics } from "@/lib/owner/analytics/getHotelAnalytics";
import type { AnalyticsPeriodKey } from "@/lib/owner/analytics/period";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") ?? "");
  if (!Number.isFinite(hotelId) || hotelId < 1) {
    return NextResponse.json({ error: "invalid_hotel" }, { status: 400 });
  }

  const periodRaw = (req.nextUrl.searchParams.get("period") ?? "today").toLowerCase();
  const periodKey = (["today", "week", "month", "custom"].includes(periodRaw)
    ? periodRaw
    : "today") as AnalyticsPeriodKey;
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;

  try {
    const data = await getHotelAnalytics({
      ownerId: owner.id,
      hotelId,
      periodKey,
      from,
      to,
      includeContributing: true
    });
    return NextResponse.json({ ok: true, analytics: data });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") return forbiddenJson();
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
