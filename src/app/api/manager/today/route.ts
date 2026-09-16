import { NextRequest, NextResponse } from "next/server";
import { getManagerUser, requireHotelPermission, HOTEL_PERMISSION } from "@/lib/staff/hotelAccess";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getHotelTodayBoard } from "@/lib/services/managerToday";

export async function GET(req: NextRequest) {
  const user = await getManagerUser();
  if (!user) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "");
  if (!hotelId) return NextResponse.json({ error: "hotel_required" }, { status: 400 });

  try {
    await requireHotelPermission(user.id, hotelId, HOTEL_PERMISSION.TODAY_VIEW);
  } catch {
    return forbiddenJson();
  }

  const board = await getHotelTodayBoard(hotelId);
  return NextResponse.json({ ok: true, ...board });
}
