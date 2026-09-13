import { prisma } from "@/lib/prisma";
import { assertDatesAvailable, DatesUnavailableError, withRoomOverlapGuard } from "@/lib/booking/availability";
import { findAvailablePhysicalRoom } from "@/lib/pms/inventory";
import { getBookingPhysicalRoomId } from "@/lib/pms/types";

export async function assignBookingToRoom(params: {
  bookingId: number;
  roomId: number;
  ownerId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      OR: [
        { room: { hotel: { ownerId: params.ownerId } } },
        { roomType: { hotel: { ownerId: params.ownerId } } }
      ]
    }
  });
  if (!booking) return { ok: false, error: "not_found" };

  const room = await prisma.room.findFirst({
    where: { id: params.roomId, hotel: { ownerId: params.ownerId } },
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
    // The check above is a plain SELECT, not atomic with the write below - withRoomOverlapGuard
    // (DB EXCLUDE constraint) is the actual backstop against a concurrent assignment/confirmation
    // claiming the same physical room for overlapping dates.
    await withRoomOverlapGuard(() =>
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          assignedRoomId: room.id,
          roomId: room.id,
          roomTypeId: room.roomTypeId ?? booking.roomTypeId
        }
      })
    );
  } catch (e) {
    if (e instanceof DatesUnavailableError) {
      return { ok: false, error: "dates_unavailable" };
    }
    throw e;
  }

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

  try {
    // Same SELECT-then-write gap as assignBookingToRoom above - withRoomOverlapGuard is the real
    // protection. On conflict, fail safe: leave the booking room-type-only (unassigned) rather
    // than incorrectly claiming a room another concurrent request just took.
    await withRoomOverlapGuard(() =>
      prisma.booking.update({
        where: { id: bookingId },
        data: { assignedRoomId: roomId, roomId }
      })
    );
  } catch (e) {
    if (e instanceof DatesUnavailableError) return null;
    throw e;
  }
  return roomId;
}
