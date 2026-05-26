import { prisma } from "@/lib/prisma";

/** Ensure every room has a RoomType (idempotent backfill for dev / post-migration) */
export async function ensureRoomTypesForHotel(hotelId: number): Promise<void> {
  const rooms = await prisma.room.findMany({ where: { hotelId } });
  for (const room of rooms) {
    if (room.roomTypeId) continue;
    let rt = await prisma.roomType.findFirst({ where: { hotelId, name: room.title } });
    if (!rt) {
      rt = await prisma.roomType.create({
        data: {
          hotelId,
          name: room.title,
          basePrice: room.price,
          weekendPrice: room.weekendPrice,
          minNights: room.minNights,
          extraGuestPrice: room.extraGuestPrice,
          maxGuests: room.capacity,
          amenities: room.amenities
        }
      });
      await prisma.ratePlan.create({
        data: { roomTypeId: rt.id, name: "Стандартный тариф", mealPlan: rt.mealPlan, isDefault: true }
      });
    }
    await prisma.room.update({
      where: { id: room.id },
      data: {
        roomTypeId: rt.id,
        roomNumber: room.roomNumber ?? `R-${room.id}`
      }
    });
  }

  const bookings = await prisma.booking.findMany({
    where: { room: { hotelId }, roomTypeId: null },
    select: { id: true, roomId: true }
  });
  for (const b of bookings) {
    if (!b.roomId) continue;
    const room = await prisma.room.findUnique({ where: { id: b.roomId }, select: { roomTypeId: true } });
    if (!room?.roomTypeId) continue;
    await prisma.booking.update({
      where: { id: b.id },
      data: { roomTypeId: room.roomTypeId, assignedRoomId: b.roomId }
    });
  }
}
