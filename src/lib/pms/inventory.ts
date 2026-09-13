import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertDatesAvailable,
  bookingOccupiesDay,
  DatesUnavailableError,
  getRoomBookingsInRange,
  isOccupyingOfflineStatus,
  isOccupyingOnlineStatus,
  OCCUPYING_OFFLINE_STATUSES,
  OCCUPYING_ONLINE_STATUSES
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

/**
 * Real, date-scoped "does this hotel have anything a guest could actually book for
 * [checkIn, checkOut)" check - used by search (to not list a fully-booked hotel as available)
 * and the hotel detail page (to mark specific categories/rooms sold out instead of either
 * silently disappearing or claiming availability the DB doesn't back). Uses the same canonical
 * invariants the real booking write path enforces (assertRoomTypeAvailable / assertDatesAvailable)
 * - never a second, parallel availability implementation.
 */
export async function getHotelDateAvailability(
  hotelId: number,
  checkIn: Date,
  checkOut: Date
): Promise<{ unavailableRoomTypeIds: Set<number>; unavailableRoomIds: Set<number>; hasAnyAvailability: boolean }> {
  const [roomTypes, standaloneRooms] = await Promise.all([
    prisma.roomType.findMany({ where: { hotelId }, select: { id: true } }),
    prisma.room.findMany({
      where: { hotelId, roomTypeId: null },
      select: { id: true, status: true, availability: true }
    })
  ]);

  const unavailableRoomTypeIds = new Set<number>();
  let hasAnyAvailability = false;

  for (const rt of roomTypes) {
    const snap = await getRoomTypeAvailability({ roomTypeId: rt.id, checkIn, checkOut });
    if (snap.availableCount < 1) unavailableRoomTypeIds.add(rt.id);
    else hasAnyAvailability = true;
  }

  const unavailableRoomIds = new Set<number>();
  for (const room of standaloneRooms) {
    if (!isRoomSellable(room)) {
      unavailableRoomIds.add(room.id);
      continue;
    }
    try {
      await assertDatesAvailable({ roomId: room.id, checkIn, checkOut });
      hasAnyAvailability = true;
    } catch (e) {
      if (e instanceof DatesUnavailableError) unavailableRoomIds.add(room.id);
      else throw e;
    }
  }

  return { unavailableRoomTypeIds, unavailableRoomIds, hasAnyAvailability };
}

/**
 * Bulk counterpart to getHotelDateAvailability, for the one caller that needs it for N
 * candidates at once (search) instead of one hotel (the hotel detail page, where N=1 and the
 * per-hotel version above is fine). Measured live: the naive "call getHotelDateAvailability per
 * candidate" loop was a genuine N+1/fan-out - 140 queries for 20 candidates, 65 for 5, scaling
 * with candidate count (not a false alarm). This batches the same reads into a handful of
 * `IN (...)` queries instead of one round trip per room/RoomType, but computes availability with
 * the exact same rules as the per-hotel functions above (isRoomSellable, OCCUPYING_ONLINE_STATUSES,
 * OCCUPYING_OFFLINE_STATUSES, the same [checkIn, checkOut) overlap, RoomDateOverride blocks,
 * unassigned type-level bookings) - never a second, looser availability definition for search.
 */
export async function getHotelsDateAvailabilityBulk(
  hotelIds: number[],
  checkIn: Date,
  checkOut: Date
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>(hotelIds.map((id) => [id, false]));
  if (!hotelIds.length) return result;

  const [roomTypes, rooms] = await Promise.all([
    prisma.roomType.findMany({ where: { hotelId: { in: hotelIds } }, select: { id: true, hotelId: true } }),
    prisma.room.findMany({
      where: { hotelId: { in: hotelIds } },
      select: { id: true, hotelId: true, roomTypeId: true, status: true, availability: true, housekeepingStatus: true }
    })
  ]);

  const sellableRooms = rooms.filter(isRoomSellable);
  const sellableRoomIds = sellableRooms.map((r) => r.id);
  const roomTypeIds = roomTypes.map((rt) => rt.id);

  const [overlappingBookings, blockedOverrides] = await Promise.all([
    prisma.booking.findMany({
      where: {
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        OR: [
          {
            roomId: { in: sellableRoomIds },
            OR: [
              { source: BOOKING_SOURCE.PLATFORM, status: { in: [...OCCUPYING_ONLINE_STATUSES] } },
              { source: BOOKING_SOURCE.OWNER_MANUAL, offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES] } }
            ]
          },
          {
            roomTypeId: { in: roomTypeIds },
            assignedRoomId: null,
            roomId: null,
            OR: [
              { source: BOOKING_SOURCE.PLATFORM, status: { in: [...OCCUPYING_ONLINE_STATUSES] } },
              { source: BOOKING_SOURCE.OWNER_MANUAL, offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES] } }
            ]
          }
        ]
      },
      select: { roomId: true, roomTypeId: true }
    }),
    sellableRoomIds.length
      ? prisma.roomDateOverride.findMany({
          where: { roomId: { in: sellableRoomIds }, isBlocked: true, date: { gte: checkIn, lt: checkOut } },
          select: { roomId: true }
        })
      : Promise.resolve([] as { roomId: number }[])
  ]);

  const occupiedRoomIds = new Set<number>([
    ...overlappingBookings.filter((b) => b.roomId != null).map((b) => b.roomId as number),
    ...blockedOverrides.map((o) => o.roomId)
  ]);
  const occupiedUnassignedByType = new Map<number, number>();
  for (const b of overlappingBookings) {
    if (b.roomId == null && b.roomTypeId != null) {
      occupiedUnassignedByType.set(b.roomTypeId, (occupiedUnassignedByType.get(b.roomTypeId) ?? 0) + 1);
    }
  }

  // Standalone physical rooms (no RoomType) - free if sellable and not occupied.
  for (const room of sellableRooms) {
    if (room.roomTypeId == null && !occupiedRoomIds.has(room.id)) {
      result.set(room.hotelId, true);
    }
  }

  // RoomType-backed inventory - same formula as getRoomTypeAvailability, batched.
  const sellableByType = new Map<number, number>();
  const occupiedByType = new Map<number, number>();
  for (const room of sellableRooms) {
    if (room.roomTypeId == null) continue;
    sellableByType.set(room.roomTypeId, (sellableByType.get(room.roomTypeId) ?? 0) + 1);
    if (occupiedRoomIds.has(room.id)) {
      occupiedByType.set(room.roomTypeId, (occupiedByType.get(room.roomTypeId) ?? 0) + 1);
    }
  }
  for (const rt of roomTypes) {
    const total = sellableByType.get(rt.id) ?? 0;
    const occupied = (occupiedByType.get(rt.id) ?? 0) + (occupiedUnassignedByType.get(rt.id) ?? 0);
    if (total - occupied > 0) result.set(rt.hotelId, true);
  }

  return result;
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
