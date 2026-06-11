import { prisma } from "@/lib/prisma";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { findAvailablePhysicalRoom } from "@/lib/pms/inventory";
import { getBookingPhysicalRoomId } from "@/lib/pms/types";
import { moderatorBookingWhere, moderatorHotelWhere } from "@/lib/pms/moderatorQueries";
import { ownerBookingWhere } from "@/lib/pms/ownerQueries";

type AssignActor = { ownerId: number } | { moderatorUserId: number };

function bookingActorWhere(actor: AssignActor) {
  if ("ownerId" in actor) return ownerBookingWhere(actor.ownerId);
  return moderatorBookingWhere(actor.moderatorUserId);
}

function roomActorWhere(actor: AssignActor, roomId: number) {
  if ("ownerId" in actor) {
    return { id: roomId, hotel: { ownerId: actor.ownerId } };
  }
  return { id: roomId, hotel: moderatorHotelWhere(actor.moderatorUserId) };
}

export async function assignBookingToRoom(params: {
  bookingId: number;
  roomId: number;
} & AssignActor): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      ...bookingActorWhere(params)
    }
  });
  if (!booking) return { ok: false, error: "not_found" };

  const room = await prisma.room.findFirst({
    where: roomActorWhere(params, params.roomId),
    select: { id: true, roomTypeId: true, hotelId: true }
  });
  if (!room) return { ok: false, error: "room_not_found" };

  if (booking.roomTypeId && room.roomTypeId && booking.roomTypeId !== room.roomTypeId) {
    return { ok: false, error: "room_type_mismatch" };
  }

  try {
    await assertDatesAvailable({
      roomId: room.id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      excludeBookingId: booking.id
    });
  } catch (e) {
    if (e instanceof DatesUnavailableError) {
      return { ok: false, error: "dates_unavailable" };
    }
    throw e;
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      assignedRoomId: room.id,
      roomId: room.id,
      roomTypeId: room.roomTypeId ?? booking.roomTypeId
    }
  });

  return { ok: true };
}

export async function autoAssignBookingIfPossible(bookingId: number): Promise<number | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, roomTypeId: true, checkIn: true, checkOut: true, assignedRoomId: true, roomId: true }
  });
  if (!booking?.roomTypeId) return getBookingPhysicalRoomId(booking ?? { roomId: null });
  if (getBookingPhysicalRoomId(booking)) return getBookingPhysicalRoomId(booking);

  const roomId = await findAvailablePhysicalRoom({
    roomTypeId: booking.roomTypeId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    excludeBookingId: booking.id
  });
  if (!roomId) return null;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { assignedRoomId: roomId, roomId }
  });
  return roomId;
}
