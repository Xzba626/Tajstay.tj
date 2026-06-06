import { prisma } from "@/lib/prisma";
import {
  ACTIVE_OFFLINE_BOOKING_STATUSES,
  ACTIVE_ONLINE_BOOKING_STATUSES,
  bookingOccupiesDay,
  getRoomBookingsInRange,
  isOccupyingOfflineStatus,
  isOccupyingOnlineStatus
} from "@/lib/booking/availability";
import { BOOKING_SOURCE } from "@/lib/domain/booking";
import { NON_SELLABLE_ROOM_STATUSES, PHYSICAL_ROOM_STATUS } from "@/lib/pms/types";

export type RoomTypeAvailability = {
  roomTypeId: number;
  totalRooms: number;
  occupiedCount: number;
  availableCount: number;
  unavailableMaintenance: number;
};

function isRoomSellable(room: { status: string; availability: boolean; housekeepingStatus?: string }): boolean {
  if (!room.availability) return false;
  if ((NON_SELLABLE_ROOM_STATUSES as readonly string[]).includes(room.status)) return false;
  if (room.status === PHYSICAL_ROOM_STATUS.CLEANING) return false;
  return true;
}

export async function getPhysicalRoomsForType(roomTypeId: number) {
  return prisma.room.findMany({
    where: { roomTypeId },
    select: {
      id: true,
      hotelId: true,
      roomNumber: true,
      title: true,
      status: true,
      availability: true,
      housekeepingStatus: true,
      roomTypeId: true
    },
    orderBy: [{ roomNumber: "asc" }, { id: "asc" }]
  });
}

/** Count how many physical rooms of a type are free for [checkIn, checkOut) */
export async function getRoomTypeAvailability(params: {
  roomTypeId: number;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId?: number;
}): Promise<RoomTypeAvailability> {
  const { roomTypeId, checkIn, checkOut, excludeBookingId } = params;
  const rooms = await getPhysicalRoomsForType(roomTypeId);
  const sellable = rooms.filter(isRoomSellable);
  const totalRooms = sellable.length;
  const unavailableMaintenance = rooms.length - totalRooms;

  let occupiedCount = 0;
  for (const room of sellable) {
    const bookings = await getRoomBookingsInRange(room.id, checkIn, checkOut);
    const hit = bookings.find((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.source === BOOKING_SOURCE.PLATFORM) {
        return (ACTIVE_ONLINE_BOOKING_STATUSES as readonly string[]).includes(b.status);
      }
      return (ACTIVE_OFFLINE_BOOKING_STATUSES as readonly string[]).includes(b.offlineStatus ?? "");
    });
    if (hit) occupiedCount += 1;
  }

  // Unassigned type-level bookings consume inventory without a physical room
  const unassigned = await prisma.booking.findMany({
    where: {
      roomTypeId,
      assignedRoomId: null,
      roomId: null,
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      OR: [
        { source: BOOKING_SOURCE.PLATFORM, status: { in: [...ACTIVE_ONLINE_BOOKING_STATUSES] } },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...ACTIVE_OFFLINE_BOOKING_STATUSES] }
        }
      ],
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
    },
    select: { id: true }
  });

  occupiedCount += unassigned.length;

  const availableCount = Math.max(0, totalRooms - occupiedCount);
  return { roomTypeId, totalRooms, occupiedCount, availableCount, unavailableMaintenance };
}

export class RoomTypeUnavailableError extends Error {
  constructor(message = "No rooms available for this category") {
    super(message);
    this.name = "RoomTypeUnavailableError";
  }
}

export async function assertRoomTypeAvailable(params: {
  roomTypeId: number;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId?: number;
}): Promise<void> {
  const snap = await getRoomTypeAvailability(params);
  if (snap.availableCount < 1) throw new RoomTypeUnavailableError();
}

/** Pick first free sellable room for auto-assignment */
export async function findAvailablePhysicalRoom(params: {
  roomTypeId: number;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId?: number;
}): Promise<number | null> {
  const rooms = await getPhysicalRoomsForType(params.roomTypeId);
  for (const room of rooms.filter(isRoomSellable)) {
    const bookings = await getRoomBookingsInRange(room.id, params.checkIn, params.checkOut);
    const conflict = bookings.find((b) => {
      if (params.excludeBookingId && b.id === params.excludeBookingId) return false;
      if (b.source === BOOKING_SOURCE.PLATFORM) {
        return (ACTIVE_ONLINE_BOOKING_STATUSES as readonly string[]).includes(b.status);
      }
      return (ACTIVE_OFFLINE_BOOKING_STATUSES as readonly string[]).includes(b.offlineStatus ?? "");
    });
    if (!conflict) return room.id;
  }
  return null;
}

export async function getRoomTypeDaySummary(roomTypeId: number, day: Date) {
  const rooms = await getPhysicalRoomsForType(roomTypeId);
  const sellable = rooms.filter(isRoomSellable);
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  let occupied = 0;
  for (const room of sellable) {
    const bookings = await getRoomBookingsInRange(room.id, day, nextDay);
    const hit = bookings.find((b) =>
      bookingOccupiesDay(b.checkIn, b.checkOut, day) &&
      (b.source === BOOKING_SOURCE.PLATFORM
        ? isOccupyingOnlineStatus(b.status)
        : isOccupyingOfflineStatus(b.offlineStatus))
    );
    if (hit) occupied += 1;
  }

  return {
    roomTypeId,
    total: sellable.length,
    occupied,
    available: Math.max(0, sellable.length - occupied)
  };
}
