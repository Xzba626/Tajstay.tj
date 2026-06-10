import { NextRequest, NextResponse } from "next/server";
import { isGuardResponse, requireModeratorApiUser } from "@/lib/auth/apiGuard";
import { prisma } from "@/lib/prisma";
import { moderatorOfflineBookingWhere } from "@/lib/pms/moderatorQueries";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { toOfflinePublicView } from "@/lib/pms/offlinePrivacy";

export async function GET(req: NextRequest) {
  const user = await requireModeratorApiUser();
  if (isGuardResponse(user)) return user;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      ...moderatorOfflineBookingWhere(user.id),
      OR: [
        { guestName: { contains: q, mode: "insensitive" } },
        { guestPhone: { contains: q } },
        { publicCode: { contains: q, mode: "insensitive" } }
      ]
    },
    include: bookingWithHotelInclude,
    orderBy: { checkIn: "desc" },
    take: 20
  });

  return NextResponse.json({
    ok: true,
    items: bookings.map((b) => ({
      ...toOfflinePublicView(b),
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString()
    }))
  });
}
