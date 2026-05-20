import { prisma } from "@/lib/prisma";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { calculateCheckoutBreakdown } from "@/lib/services/checkoutFinance";

function normalizeDateOnly(d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(Date.UTC(y, m, day, 0, 0, 0));
}

export function getNightDates(checkIn: Date, checkOut: Date): Date[] {
  const start = normalizeDateOnly(checkIn);
  const end = normalizeDateOnly(checkOut);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((end.getTime() - start.getTime()) / msPerDay);

  if (!Number.isFinite(diff) || diff <= 0) return [];

  // Each night is a date that corresponds to [date, date+1).
  return Array.from({ length: diff }, (_, i) => new Date(start.getTime() + i * msPerDay));
}

export function dateKey(d: Date): string {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function isWeekendNight(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

function nightBasePrice(room: { price: unknown; weekendPrice: unknown | null }, night: Date): number {
  if (isWeekendNight(night) && room.weekendPrice != null) {
    return Number(room.weekendPrice);
  }
  return Number(room.price);
}

export async function computeRoomTotalPrice(params: {
  roomId: number;
  checkIn: Date;
  checkOut: Date;
  guestCount?: number;
}): Promise<{
  totalPrice: number;
  commission: number;
  payOnArrival: boolean;
  serviceFee: number;
  taxAmount: number;
  totalUsd: number;
  ownerPayoutAfterEscrow: number;
}> {
  const { roomId, checkIn, checkOut, guestCount = 1 } = params;
  const nights = getNightDates(checkIn, checkOut);
  if (!nights.length) throw new Error("Invalid dates");

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { hotel: true }
  });
  if (!room) throw new Error("Room not found");
  if (room.hotel.status !== "APPROVED") throw new Error("Hotel not available");
  if (!room.availability) throw new Error("Room not available");

  const minNights = Math.max(1, room.minNights ?? 1);
  if (nights.length < minNights) {
    throw new Error(`Minimum stay is ${minNights} night(s)`);
  }

  try {
    await assertDatesAvailable({ roomId, checkIn, checkOut });
  } catch (e) {
    if (e instanceof DatesUnavailableError) throw new Error("Requested dates are unavailable");
    throw e;
  }

  const minDate = nights[0];
  const maxExclusive = nights[nights.length - 1];
  const maxNext = new Date(maxExclusive.getTime() + 24 * 60 * 60 * 1000);

  const overrides = await prisma.roomDateOverride.findMany({
    where: {
      roomId,
      date: {
        gte: minDate,
        lt: maxNext
      }
    }
  });

  const overridesByKey = new Map<string, { customPrice: any; isBlocked: boolean }>();
  for (const o of overrides) {
    overridesByKey.set(dateKey(o.date), { customPrice: o.customPrice, isBlocked: o.isBlocked });
  }

  let total = 0;
  for (const night of nights) {
    const key = dateKey(night);
    const ov = overridesByKey.get(key);
    if (ov?.isBlocked) throw new Error("Requested dates are unavailable");

    const perNight = ov && ov.customPrice != null ? Number(ov.customPrice) : nightBasePrice(room, night);
    total += perNight;
  }

  const extraGuests = Math.max(0, guestCount - room.capacity);
  if (extraGuests > 0 && room.extraGuestPrice != null) {
    total += extraGuests * nights.length * Number(room.extraGuestPrice);
  }

  const breakdown = calculateCheckoutBreakdown({ subtotal: total });

  return {
    totalPrice: breakdown.totalToCharge,
    commission: breakdown.commission,
    payOnArrival: false,
    serviceFee: breakdown.serviceFee,
    taxAmount: breakdown.taxAmount,
    totalUsd: breakdown.totalUsd,
    ownerPayoutAfterEscrow: breakdown.ownerPayoutAfterEscrow
  };
}

