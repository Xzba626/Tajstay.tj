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
        amenities: roomType.amenities,
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
  await prisma.room.updateMany({
    where: { roomTypeId, status: { not: "ARCHIVED" } },
    data: {
      price: rt.basePrice,
      weekendPrice: rt.weekendPrice,
      minNights: rt.minNights,
      extraGuestPrice: rt.extraGuestPrice,
      capacity: rt.maxGuests,
      amenities: rt.amenities
    }
  });
}
