import { NextRequest, NextResponse } from "next/server";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { isGuardResponse, requireModeratorApiUser, PERMISSION } from "@/lib/auth/apiGuard";
import { getModeratorCalendarData } from "@/lib/services/ownerCalendar";
import { prisma } from "@/lib/prisma";
import { moderatorHotelWhere } from "@/lib/pms/moderatorQueries";

export async function GET(req: NextRequest) {
  const user = await requireModeratorApiUser();
  if (isGuardResponse(user)) return user;

  const days = Math.min(60, Math.max(7, Number(req.nextUrl.searchParams.get("days") || "30") || 30));
  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "") || undefined;
  const roomId = Number(req.nextUrl.searchParams.get("roomId") || "") || undefined;

  if (hotelId) {
    const allowed = await prisma.hotel.findFirst({
      where: { id: hotelId, ...moderatorHotelWhere(user.id) },
      select: { id: true }
    });
    if (!allowed) return forbiddenJson();
  }

  const data = await getModeratorCalendarData(user.id, days);
  let { rooms } = data;
  if (hotelId) rooms = rooms.filter((r) => r.hotelId === hotelId);
  if (roomId) rooms = rooms.filter((r) => r.id === roomId);

  return NextResponse.json({ ok: true, ...data, rooms, permission: PERMISSION.VIEW_CALENDAR });
}
