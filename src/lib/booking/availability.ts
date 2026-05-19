import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE, BOOKING_STATUS, OFFLINE_STATUS } from "@/lib/domain/booking";

/** Statuses that block the room calendar for online bookings */
export const BLOCKING_ONLINE_STATUSES = [
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW,
  BOOKING_STATUS.PENDING_OWNER,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.COMPLETED
] as const;

export const BLOCKING_OFFLINE_STATUSES = [
  OFFLINE_STATUS.PENDING,
  OFFLINE_STATUS.CONFIRMED,
  OFFLINE_STATUS.CHECKED_IN
] as const;

function normalizeDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

export function datesOverlap(
  aIn: Date,
  aOut: Date,
  bIn: Date,
  bOut: Date
): boolean {
  return aIn.getTime() < bOut.getTime() && aOut.getTime() > bIn.getTime();
}

export async function getBlockedDatesInRange(
  roomId: number,
  from: Date,
  to: Date
): Promise<Date[]> {
  const overrides = await prisma.roomDateOverride.findMany({
    where: {
      roomId,
      isBlocked: true,
      date: { gte: from, lt: to }
    },
    select: { date: true }
  });
  return overrides.map((o) => normalizeDateOnly(o.date));
}

export async function getRoomBookingsInRange(roomId: number, from: Date, to: Date) {
  return prisma.booking.findMany({
    where: {
      roomId,
      checkIn: { lt: to },
      checkOut: { gt: from },
      OR: [
        {
          source: BOOKING_SOURCE.PLATFORM,
          status: { in: [...BLOCKING_ONLINE_STATUSES] }
        },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...BLOCKING_OFFLINE_STATUSES] }
        }
      ]
    },
    select: {
      id: true,
      source: true,
      status: true,
      offlineStatus: true,
      checkIn: true,
      checkOut: true,
      guestName: true,
      guestPhone: true,
      publicCode: true,
      user: { select: { name: true, phone: true } }
    },
    orderBy: { checkIn: "asc" }
  });
}

export class DatesUnavailableError extends Error {
  constructor(message = "Requested dates are unavailable") {
    super(message);
    this.name = "DatesUnavailableError";
  }
}

export async function assertDatesAvailable(params: {
  roomId: number;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId?: number;
}): Promise<void> {
  const { roomId, checkIn, checkOut, excludeBookingId } = params;
  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new DatesUnavailableError("Invalid dates");
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      OR: [
        {
          source: BOOKING_SOURCE.PLATFORM,
          status: { in: [...BLOCKING_ONLINE_STATUSES] }
        },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...BLOCKING_OFFLINE_STATUSES] }
        }
      ]
    },
    select: { id: true }
  });
  if (overlap) throw new DatesUnavailableError();

  const nightsStart = normalizeDateOnly(checkIn);
  const nightsEnd = normalizeDateOnly(checkOut);
  const blocked = await prisma.roomDateOverride.findFirst({
    where: {
      roomId,
      isBlocked: true,
      date: { gte: nightsStart, lt: nightsEnd }
    },
    select: { id: true }
  });
  if (blocked) throw new DatesUnavailableError();
}
