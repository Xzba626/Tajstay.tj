import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE, BOOKING_STATUS, OFFLINE_STATUS } from "@/lib/domain/booking";

/** Confirmed / active online bookings — block calendar & conflict checks */
export const OCCUPYING_ONLINE_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.COMPLETED
] as const;

/** Pending online — show in calendar only, do not block new confirmations */
export const PENDING_ONLINE_STATUSES = [
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW,
  BOOKING_STATUS.PENDING_OWNER
] as const;

export const OCCUPYING_OFFLINE_STATUSES = [OFFLINE_STATUS.CONFIRMED, OFFLINE_STATUS.CHECKED_IN] as const;

export const PENDING_OFFLINE_STATUSES = [OFFLINE_STATUS.PENDING] as const;

/** @deprecated Use OCCUPYING_ONLINE_STATUSES — kept for imports that expected broad blocking */
export const BLOCKING_ONLINE_STATUSES = OCCUPYING_ONLINE_STATUSES;

export const BLOCKING_OFFLINE_STATUSES = OCCUPYING_OFFLINE_STATUSES;

const CALENDAR_ONLINE_STATUSES = [...OCCUPYING_ONLINE_STATUSES, ...PENDING_ONLINE_STATUSES] as const;

function normalizeDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

/** Hotel rule: night of checkIn is occupied; checkOut morning is free — [checkIn, checkOut) */
export function bookingOccupiesDay(checkIn: Date, checkOut: Date, day: Date): boolean {
  const dayStart = normalizeDateOnly(day);
  const dayEnd = addDays(dayStart, 1);
  const bIn = normalizeDateOnly(checkIn);
  const bOut = normalizeDateOnly(checkOut);
  return bIn.getTime() < dayEnd.getTime() && bOut.getTime() > dayStart.getTime();
}

export function datesOverlap(aIn: Date, aOut: Date, bIn: Date, bOut: Date): boolean {
  return aIn.getTime() < bOut.getTime() && aOut.getTime() > bIn.getTime();
}

export function isOccupyingOnlineStatus(status: string): boolean {
  return (OCCUPYING_ONLINE_STATUSES as readonly string[]).includes(status);
}

export function isPendingOnlineStatus(status: string): boolean {
  return (PENDING_ONLINE_STATUSES as readonly string[]).includes(status);
}

export function isOccupyingOfflineStatus(offlineStatus: string | null | undefined): boolean {
  if (!offlineStatus) return false;
  return (OCCUPYING_OFFLINE_STATUSES as readonly string[]).includes(offlineStatus);
}

export function isPendingOfflineStatus(offlineStatus: string | null | undefined): boolean {
  if (!offlineStatus) return false;
  return (PENDING_OFFLINE_STATUSES as readonly string[]).includes(offlineStatus);
}

export async function getBlockedDatesInRange(roomId: number, from: Date, to: Date): Promise<Date[]> {
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
          status: { in: [...CALENDAR_ONLINE_STATUSES] }
        },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES, ...PENDING_OFFLINE_STATUSES] }
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
      phone: true,
      totalPrice: true,
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
          status: { in: [...OCCUPYING_ONLINE_STATUSES] }
        },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES] }
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
