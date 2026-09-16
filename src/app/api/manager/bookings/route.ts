import { NextRequest, NextResponse } from "next/server";
import { getManagerUser, listActiveStaffHotels, requireHotelPermission, HOTEL_PERMISSION } from "@/lib/staff/hotelAccess";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { createManualOfflineBooking } from "@/lib/services/ownerOfflineBooking";
import { quoteOfflineStayTotal } from "@/lib/services/offlinePricing";
import { hotelBookingWhere } from "@/lib/pms/ownerQueries";
import { getRoomTypeAvailability } from "@/lib/pms/inventory";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { STAFF_STATUS } from "@/lib/staff/types";

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

async function touchLastActive(userId: number, hotelId: number) {
  await prisma.hotelStaff
    .updateMany({
      where: { userId, hotelId, status: STAFF_STATUS.ACTIVE },
      data: { lastActiveAt: new Date() }
    })
    .catch(() => undefined);
}

export async function GET(req: NextRequest) {
  const user = await getManagerUser();
  if (!user) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "");
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  const filter = String(req.nextUrl.searchParams.get("filter") || "all");

  if (!hotelId) {
    const hotels = await listActiveStaffHotels(user.id);
    return NextResponse.json({
      ok: true,
      hotels: hotels.map((h) => ({
        id: h.hotel.id,
        name: h.hotel.name,
        city: h.hotel.city,
        staffRole: h.staffRole
      }))
    });
  }

  try {
    await requireHotelPermission(user.id, hotelId, HOTEL_PERMISSION.BOOKING_VIEW);
  } catch {
    return forbiddenJson();
  }

  await touchLastActive(user.id, hotelId);

  const where: Record<string, unknown> = { ...hotelBookingWhere(hotelId) };
  if (q) {
    where.AND = [
      hotelBookingWhere(hotelId),
      {
        OR: [
          { publicCode: { equals: q, mode: "insensitive" } },
          { guestName: { contains: q, mode: "insensitive" } },
          { guestPhone: { contains: q } },
          { phone: { contains: q } }
        ]
      }
    ];
    delete where.OR;
  }

  if (filter === "action") {
    where.status = { in: ["PENDING_OWNER", "ON_REVIEW"] };
  } else if (filter === "confirmed") {
    where.OR = [
      { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      { offlineStatus: { in: ["CONFIRMED", "CHECKED_IN"] } }
    ];
  } else if (filter === "archive") {
    where.OR = [
      { status: { in: ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"] } },
      { offlineStatus: { in: ["CHECKED_OUT", "CANCELLED"] } }
    ];
  }

  const items = await prisma.booking.findMany({
    where,
    include: {
      roomType: { select: { id: true, name: true, maxGuests: true, basePrice: true } },
      assignedRoom: { select: { id: true, roomNumber: true, title: true } },
      room: { select: { id: true, roomNumber: true, title: true } },
      user: { select: { name: true, phone: true } }
    },
    orderBy: { checkIn: "desc" },
    take: 50
  });

  return NextResponse.json({
    ok: true,
    items: items.map((b) => ({
      id: b.id,
      publicCode: b.publicCode,
      guestName: b.guestName ?? b.user?.name ?? "—",
      guestPhone: b.guestPhone ?? b.user?.phone ?? b.phone,
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString(),
      guestCount: b.guestCount,
      status: b.status,
      offlineStatus: b.offlineStatus,
      paymentStatus: b.paymentStatus,
      settlementChannel: b.settlementChannel ?? b.offlinePaymentType,
      source: b.source,
      totalPrice: Number(b.totalPrice),
      payOnArrival: b.payOnArrival,
      categoryName: b.roomType?.name ?? null,
      roomLabel: b.assignedRoom?.roomNumber || b.room?.roomNumber || null,
      offlineNote: b.offlineNote
    }))
  });
}

export async function POST(req: NextRequest) {
  const user = await getManagerUser();
  if (!user) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const hotelId = Number(body.hotelId || "");
  const roomTypeId = Number(body.roomTypeId || "");
  const roomId = body.roomId != null && body.roomId !== "" ? Number(body.roomId) : null;
  const checkIn = parseDateOnly(String(body.checkIn ?? ""));
  const checkOut = parseDateOnly(String(body.checkOut ?? ""));
  const guestName = String(body.guestName ?? "").trim();
  const guestPhone = String(body.guestPhone ?? "").trim();
  const guestCount = Math.max(1, Number(body.guestCount || 1) || 1);
  const settlement = String(body.settlement || body.offlinePaymentType || "CASH").toUpperCase();
  const markPaid = body.markPaid !== false && body.paid !== false;
  const offlineNote = String(body.offlineNote ?? "").trim() || null;

  if (!hotelId || !roomTypeId || !checkIn || !checkOut || !guestName || !guestPhone) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const access = await requireHotelPermission(user.id, hotelId, HOTEL_PERMISSION.BOOKING_CREATE_OFFLINE);
    if (access.mustChangePassword) {
      return NextResponse.json({ error: "must_change_password" }, { status: 403 });
    }

    const booking = await createManualOfflineBooking({
      actorUserId: user.id,
      actorRole: "MANAGER",
      hotelId,
      roomTypeId,
      roomId,
      checkIn,
      checkOut,
      guestName,
      guestPhone,
      guestCount,
      offlinePaymentType: settlement === "CARD" ? "CARD" : "CASH",
      markPaid,
      offlineNote
    });

    await touchLastActive(user.id, hotelId);

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      publicCode: booking.publicCode,
      totalPrice: Number(booking.totalPrice),
      paymentStatus: booking.paymentStatus
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (code === "FORBIDDEN") return forbiddenJson();
    const status = code === "dates_unavailable" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
