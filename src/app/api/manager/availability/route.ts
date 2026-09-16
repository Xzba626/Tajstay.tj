import { NextRequest, NextResponse } from "next/server";
import { getManagerUser, requireHotelPermission, HOTEL_PERMISSION } from "@/lib/staff/hotelAccess";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { quoteOfflineStayTotal } from "@/lib/services/offlinePricing";
import { getRoomTypeAvailability } from "@/lib/pms/inventory";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/** Quote price + available rooms for Manager new booking form. */
export async function GET(req: NextRequest) {
  const user = await getManagerUser();
  if (!user) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "");
  const roomTypeId = Number(req.nextUrl.searchParams.get("roomTypeId") || "");
  const checkIn = parseDateOnly(String(req.nextUrl.searchParams.get("checkIn") || ""));
  const checkOut = parseDateOnly(String(req.nextUrl.searchParams.get("checkOut") || ""));

  if (!hotelId) return NextResponse.json({ error: "hotel_required" }, { status: 400 });

  try {
    await requireHotelPermission(user.id, hotelId, HOTEL_PERMISSION.BOOKING_VIEW);
  } catch {
    return forbiddenJson();
  }

  const categories = await prisma.roomType.findMany({
    where: { hotelId, availability: true },
    select: { id: true, name: true, basePrice: true, maxGuests: true },
    orderBy: { sortOrder: "asc" }
  });

  if (!roomTypeId || !checkIn || !checkOut) {
    return NextResponse.json({ ok: true, categories, totalPrice: null, rooms: [] });
  }

  const rt = categories.find((c) => c.id === roomTypeId);
  if (!rt) return NextResponse.json({ error: "invalid_category" }, { status: 400 });

  const totalPrice = quoteOfflineStayTotal({
    basePrice: Number(rt.basePrice),
    checkIn,
    checkOut
  });

  const avail = await getRoomTypeAvailability({ roomTypeId, checkIn, checkOut });

  // Room-type capacity is authoritative. When exhausted, do not list physical
  // rooms as selectable — unassigned MANAGER_MANUAL/OWNER_MANUAL stays still
  // occupy inventory without an assignedRoomId EXCLUDE row.
  const rooms: { id: number; roomNumber: string | null; title: string | null }[] = [];
  if (avail.availableCount >= 1) {
    const physical = await prisma.room.findMany({
      where: { hotelId, roomTypeId, availability: true },
      select: { id: true, roomNumber: true, title: true, status: true }
    });

    for (const r of physical) {
      if (r.status === "OUT_OF_SERVICE" || r.status === "MAINTENANCE") continue;
      try {
        await assertDatesAvailable({ roomId: r.id, checkIn, checkOut });
        rooms.push({ id: r.id, roomNumber: r.roomNumber, title: r.title });
      } catch (e) {
        if (e instanceof DatesUnavailableError) continue;
        throw e;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    categories,
    totalPrice,
    availableCount: avail.availableCount,
    rooms,
    maxGuests: rt.maxGuests
  });
}
