import { NextRequest, NextResponse } from "next/server";
import { isGuardResponse, requireModeratorApiUser } from "@/lib/auth/apiGuard";
import { prisma } from "@/lib/prisma";
import { moderatorHotelWhere } from "@/lib/pms/moderatorQueries";

export async function GET(req: NextRequest) {
  const user = await requireModeratorApiUser();
  if (isGuardResponse(user)) return user;

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "") || undefined;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const rooms = await prisma.room.findMany({
    where: {
      hotel: moderatorHotelWhere(user.id),
      ...(hotelId ? { hotelId } : {}),
      ...(q
        ? {
            OR: [{ title: { contains: q, mode: "insensitive" } }, { roomNumber: { contains: q, mode: "insensitive" } }]
          }
        : {})
    },
    select: {
      id: true,
      title: true,
      roomNumber: true,
      status: true,
      availability: true,
      housekeepingStatus: true,
      hotel: { select: { id: true, name: true } },
      roomType: { select: { id: true, name: true } }
    },
    orderBy: [{ hotelId: "asc" }, { roomNumber: "asc" }, { id: "asc" }]
  });

  return NextResponse.json({ ok: true, rooms });
}
