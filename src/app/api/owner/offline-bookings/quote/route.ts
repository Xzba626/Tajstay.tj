import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { nightsBetween, quoteOfflineStayTotal } from "@/lib/services/offlinePricing";

/**
 * Authoritative price quote for the Offline Booking form.
 *
 * Root cause this fixes: OfflineBookingForm made `totalPrice` a REQUIRED manual input, so the
 * owner always typed a number and the authoritative quote path inside
 * `createManualOfflineBooking` (which already falls back to `quoteOfflineStayTotal` when
 * totalPrice is omitted) never ran. This endpoint exposes that SAME function — it is not a second
 * pricing engine, and the server remains the authority at create time regardless of what the
 * client displays here.
 *
 * Authorization mirrors the create route: Owner session required, and the RoomType must belong to
 * a hotel this owner owns — a client-supplied hotelId is never trusted.
 */
function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const sp = req.nextUrl.searchParams;
  const roomTypeId = Number(sp.get("roomTypeId") || "");
  const roomIdRaw = Number(sp.get("roomId") || "");
  const roomId = Number.isFinite(roomIdRaw) && roomIdRaw > 0 ? roomIdRaw : null;
  const checkIn = parseDateOnly(String(sp.get("checkIn") ?? ""));
  const checkOut = parseDateOnly(String(sp.get("checkOut") ?? ""));

  if (!Number.isFinite(roomTypeId) || roomTypeId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_room_type" }, { status: 400 });
  }
  if (!checkIn || !checkOut || checkOut.getTime() <= checkIn.getTime()) {
    return NextResponse.json({ ok: false, error: "invalid_dates" }, { status: 400 });
  }

  // Hotel scope is derived from ownership, never from the client.
  const roomType = await prisma.roomType.findFirst({
    where: { id: roomTypeId, hotel: { ownerId: owner.id } },
    select: { id: true, basePrice: true, maxGuests: true, hotelId: true }
  });
  if (!roomType) return forbiddenJson();

  // A room may only be quoted against the category it actually belongs to — this is the server
  // half of the category→room rule; frontend filtering is not authorization.
  if (roomId) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, roomTypeId: roomType.id, hotelId: roomType.hotelId },
      select: { id: true }
    });
    if (!room) {
      return NextResponse.json({ ok: false, error: "room_type_mismatch" }, { status: 400 });
    }
  }

  const basePrice = Number(roomType.basePrice);

  return NextResponse.json({
    ok: true,
    pricePerNight: basePrice,
    nights: nightsBetween(checkIn, checkOut),
    total: quoteOfflineStayTotal({ basePrice, checkIn, checkOut }),
    maxGuests: roomType.maxGuests,
    roomTypeId: roomType.id
  });
}
