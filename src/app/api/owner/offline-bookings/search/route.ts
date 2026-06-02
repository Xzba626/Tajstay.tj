import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { ownerOfflineBookingWhere } from "@/lib/pms/ownerQueries";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { toOfflinePublicView } from "@/lib/pms/offlinePrivacy";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      ...ownerOfflineBookingWhere(owner.id),
      guestName: { contains: q, mode: "insensitive" }
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
