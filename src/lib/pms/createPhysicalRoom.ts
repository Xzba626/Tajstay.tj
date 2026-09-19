import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Create one physical room under a category (RoomType).
 * Category is source of truth for price / capacity / amenities.
 * Room.price|capacity|amenities are denormalized caches for booking/search (immutable booking snapshots stay intact).
 */
export async function createPhysicalRoomFromCategory(input: {
  hotelId: number;
  ownerId: number;
  roomTypeId: number;
  roomNumber: string;
  customAmenities?: string[];
}) {
  const hotel = await prisma.hotel.findFirst({
    where: { id: input.hotelId, ownerId: input.ownerId },
    select: { id: true }
  });
  if (!hotel) throw new Error("FORBIDDEN");

  const roomNumber = input.roomNumber.trim();
  if (!roomNumber) throw new Error("INVALID_ROOM_NUMBER");

  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, hotelId: input.hotelId, availability: true }
  });
  if (!roomType) throw new Error("CATEGORY_NOT_FOUND");

  let categoryAmenities: string[] = [];
  try {
    const parsed = JSON.parse(roomType.amenities || "[]");
    categoryAmenities = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    categoryAmenities = [];
  }
  const extras = (input.customAmenities ?? []).map(String).filter(Boolean);
  const effective = Array.from(new Set([...categoryAmenities, ...extras]));

  try {
    const room = await prisma.room.create({
      data: {
        hotelId: input.hotelId,
        roomTypeId: roomType.id,
        roomNumber,
        title: `${roomType.name} ${roomNumber}`,
        price: roomType.basePrice,
        weekendPrice: roomType.weekendPrice,
        minNights: roomType.minNights,
        extraGuestPrice: roomType.extraGuestPrice,
        capacity: roomType.maxGuests,
        amenities: JSON.stringify(effective),
        customAmenities: JSON.stringify(extras),
        availability: true,
        status: "ACTIVE",
        housekeepingStatus: "CLEAN"
      }
    });
    return room;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("DUPLICATE_ROOM_NUMBER");
    }
    throw e;
  }
}

/** After category commercial fields change, refresh denormalized caches on linked ACTIVE rooms. */
export async function syncRoomsFromCategory(roomTypeId: number) {
  const rt = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
  if (!rt) return;
  let categoryAmenities: string[] = [];
  try {
    const parsed = JSON.parse(rt.amenities || "[]");
    categoryAmenities = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    categoryAmenities = [];
  }

  const rooms = await prisma.room.findMany({
    where: { roomTypeId, status: { not: "ARCHIVED" } },
    select: { id: true, customAmenities: true }
  });

  for (const room of rooms) {
    let extras: string[] = [];
    try {
      const parsed = JSON.parse(room.customAmenities || "[]");
      extras = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      extras = [];
    }
    const effective = Array.from(new Set([...categoryAmenities, ...extras]));
    await prisma.room.update({
      where: { id: room.id },
      data: {
        price: rt.basePrice,
        weekendPrice: rt.weekendPrice,
        minNights: rt.minNights,
        extraGuestPrice: rt.extraGuestPrice,
        capacity: rt.maxGuests,
        amenities: JSON.stringify(effective)
      }
    });
  }
}
