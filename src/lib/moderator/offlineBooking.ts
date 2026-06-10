import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE } from "@/lib/domain/booking";
import { moderatorHotelWhere } from "@/lib/pms/moderatorQueries";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { getBookingForModerator } from "@/lib/auth/moderatorBooking";
import {
  createOwnerOfflineBooking,
  updateOwnerOfflineBooking,
  type UpdateOfflineBookingInput
} from "@/lib/services/ownerOfflineBooking";

export async function assertModeratorRoomType(moderatorUserId: number, roomTypeId: number) {
  return prisma.roomType.findFirst({
    where: { id: roomTypeId, hotel: moderatorHotelWhere(moderatorUserId) },
    include: { hotel: true }
  });
}

export async function assertModeratorRoom(moderatorUserId: number, roomId: number) {
  return prisma.room.findFirst({
    where: { id: roomId, hotel: moderatorHotelWhere(moderatorUserId) },
    include: { hotel: true, roomType: true }
  });
}

export async function createModeratorOfflineBooking(
  moderatorUserId: number,
  input: Omit<Parameters<typeof createOwnerOfflineBooking>[0], "ownerId">
) {
  const roomType = await assertModeratorRoomType(moderatorUserId, input.roomTypeId);
  if (!roomType) throw new Error("forbidden");

  if (input.roomId) {
    const room = await assertModeratorRoom(moderatorUserId, input.roomId);
    if (!room || room.roomTypeId !== roomType.id) throw new Error("room_type_mismatch");
  }

  return createOwnerOfflineBooking({
    ...input,
    ownerId: roomType.hotel.ownerId
  });
}

export async function updateModeratorOfflineBooking(
  moderatorUserId: number,
  input: Omit<UpdateOfflineBookingInput, "ownerId">
) {
  const booking = await getBookingForModerator(input.bookingId, moderatorUserId);
  if (!booking || booking.source !== BOOKING_SOURCE.OWNER_MANUAL) throw new Error("not_found");
  const hotel = bookingHotel(booking);
  return updateOwnerOfflineBooking({ ...input, ownerId: hotel.ownerId });
}
