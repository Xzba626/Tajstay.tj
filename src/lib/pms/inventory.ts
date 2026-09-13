import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  bookingOccupiesDay,
  getRoomBookingsInRange,
  isOccupyingOfflineStatus,
  isOccupyingOnlineStatus,
  OCCUPYING_OFFLINE_STATUSES
} from "@/lib/booking/availability";
import { BOOKING_SOURCE } from "@/lib/domain/booking";
import { NON_SELLABLE_ROOM_STATUSES, PHYSICAL_ROOM_STATUS } from "@/lib/pms/types";

type DbClient = typeof prisma | Prisma.TransactionClient;

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

export async function getPhysicalRoomsForType(roomTypeId: number, client: DbClient = prisma) {
  return client.room.findMany({
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
  client?: DbClient;
}): Promise<RoomTypeAvailability> {
  const { roomTypeId, checkIn, checkOut, excludeBookingId, client = prisma } = params;
  const rooms = await getPhysicalRoomsForType(roomTypeId, client);
  const sellable = rooms.filter(isRoomSellable);
  const totalRooms = sellable.length;
  const unavailableMaintenance = rooms.length - totalRooms;

  let occupiedCount = 0;
  for (const room of sellable) {
    const bookings = await getRoomBookingsInRange(room.id, checkIn, checkOut, client);
    const hit = bookings.find((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.source === BOOKING_SOURCE.PLATFORM) return isOccupyingOnlineStatus(b.status);
      return isOccupyingOfflineStatus(b.offlineStatus);
    });
    if (hit) occupiedCount += 1;
  }

  // Unassigned type-level bookings consume inventory without a physical room
  const unassigned = await client.booking.findMany({
    where: {
      roomTypeId,
      assignedRoomId: null,
      roomId: null,
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      OR: [
        { source: BOOKING_SOURCE.PLATFORM, status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] } },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES] }
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
  client?: DbClient;
}): Promise<void> {
  const snap = await getRoomTypeAvailability(params);
  if (snap.availableCount < 1) throw new RoomTypeUnavailableError();
}

/**
 * Closes the RoomType-capacity race BLOCK 2's physical-room EXCLUDE constraint cannot cover: an
 * unassigned (no physical room resolved yet) booking has no single column to range-exclude on, so
 * capacity there is fundamentally a *counting* problem, not a *range-overlap* problem - two
 * concurrent requests can both read "1 of 1 available" before either writes.
 *
 * Fix: a Postgres transaction-scoped advisory lock keyed on `roomTypeId`
 * (`pg_advisory_xact_lock`), held for the lifetime of one short transaction that re-checks
 * capacity and performs the write together. Concurrent requests for the SAME RoomType queue up
 * and are handled one at a time (each sees the true, up-to-date remaining capacity); requests for
 * a DIFFERENT RoomType (even in the same Hotel) are never blocked - the lock key is the RoomType's
 * own id, nothing broader. The lock is released automatically when the transaction commits or
 * rolls back - no separate unlock call, no risk of a leaked lock outliving the request.
 */
export async function withRoomTypeCapacityGuard<T>(
  roomTypeId: number,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${roomTypeId})`;
    return fn(tx);
  });
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
      if (b.source === BOOKING_SOURCE.PLATFORM) return isOccupyingOnlineStatus(b.status);
      return isOccupyingOfflineStatus(b.offlineStatus);
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
