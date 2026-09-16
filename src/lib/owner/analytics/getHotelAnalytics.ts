/**
 * OWNER BLOCK 3 — single hotel analytics aggregation.
 *
 * REVENUE (recognized):
 *   paymentStatus === 'PAID'
 *   AND revenueRecognizedAt ∈ [period.start, period.end]
 *   amount = totalPrice (TJS)
 *   settlement from settlementChannel (fallback classify)
 *   channel from Booking.source (PLATFORM=online, OWNER_MANUAL=offline)
 *
 * EXPENSES:
 *   allocateExpenseVersionsToPeriod (ONE_TIME day-in-period; MONTHLY = amount/daysInMonth per day)
 *
 * NET PROFIT = revenueMinor - expenseMinor (same period)
 *
 * PENDING CONFIRMATION: PLATFORM + status PENDING_OWNER (current state, not period-bound)
 */
import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE, BOOKING_STATUS } from "@/lib/domain/booking";
import { resolveAnalyticsPeriod, type AnalyticsPeriodKey } from "@/lib/owner/analytics/period";
import { allocateExpenseVersionsToPeriod } from "@/lib/owner/analytics/expenses";
import { fromMinor, toMinor } from "@/lib/owner/analytics/money";
import { bookingChannelFromSource } from "@/lib/owner/analytics/types";
import {
  resolveSettlementChannel,
  settlementBucket,
  SETTLEMENT_CHANNEL,
  type SettlementChannel
} from "@/lib/owner/analytics/settlement";

export type HotelAnalyticsDto = {
  hotelId: number;
  hotelName: string;
  period: {
    key: AnalyticsPeriodKey;
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    cash: number;
    card: number;
    other: number;
    online: number;
    offline: number;
    unknownSource: number;
  };
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  netProfit: number;
  bookings: {
    onlineCount: number;
    offlineCount: number;
    unknownCount: number;
    pendingConfirmation: number;
    cancellationsInPeriod: number;
  };
  ops: {
    checkInsInPeriod: number;
    checkOutsInPeriod: number;
  };
  contributing: {
    id: number;
    publicCode: string | null;
    guest: string;
    source: string;
    channel: "online" | "offline" | "unknown";
    settlement: SettlementChannel;
    amount: number;
    checkIn: string;
    checkOut: string;
    recognizedAt: string;
  }[];
};

async function assertOwnerHotel(hotelId: number, ownerId: number) {
  const hotel = await prisma.hotel.findFirst({
    where: { id: hotelId, ownerId },
    select: { id: true, name: true }
  });
  if (!hotel) throw new Error("FORBIDDEN");
  return hotel;
}

export async function getHotelAnalytics(opts: {
  ownerId: number;
  hotelId: number;
  periodKey?: AnalyticsPeriodKey;
  from?: string;
  to?: string;
  includeContributing?: boolean;
}): Promise<HotelAnalyticsDto> {
  const hotel = await assertOwnerHotel(opts.hotelId, opts.ownerId);
  const period = resolveAnalyticsPeriod(opts.periodKey ?? "today", new Date(), {
    from: opts.from,
    to: opts.to
  });

  const hotelRoomFilter = {
    OR: [
      { room: { hotelId: hotel.id } },
      { roomType: { hotelId: hotel.id } },
      { assignedRoom: { hotelId: hotel.id } }
    ]
  };

  const [paidBookings, pendingConfirmation, cancellationsInPeriod, checkIns, checkOuts, expenseRows] =
    await Promise.all([
      prisma.booking.findMany({
        where: {
          AND: [
            hotelRoomFilter,
            { paymentStatus: "PAID" },
            { revenueRecognizedAt: { gte: period.start, lte: period.end } }
          ]
        },
        select: {
          id: true,
          publicCode: true,
          guestName: true,
          guestPhone: true,
          user: { select: { name: true, phone: true } },
          source: true,
          totalPrice: true,
          settlementChannel: true,
          offlinePaymentType: true,
          paymentMethod: true,
          payOnArrival: true,
          hotelPaymentMethod: { select: { type: true } },
          checkIn: true,
          checkOut: true,
          revenueRecognizedAt: true
        },
        orderBy: { revenueRecognizedAt: "desc" },
        take: opts.includeContributing === false ? 5000 : 200
      }),
      prisma.booking.count({
        where: {
          AND: [hotelRoomFilter, { source: BOOKING_SOURCE.PLATFORM, status: BOOKING_STATUS.PENDING_OWNER }]
        }
      }),
      prisma.booking.count({
        where: {
          AND: [
            hotelRoomFilter,
            {
              OR: [
                { status: BOOKING_STATUS.CANCELLED, createdAt: { gte: period.start, lte: period.end } },
                {
                  source: BOOKING_SOURCE.OWNER_MANUAL,
                  offlineStatus: "CANCELLED",
                  createdAt: { gte: period.start, lte: period.end }
                }
              ]
            }
          ]
        }
      }),
      prisma.booking.count({
        where: {
          AND: [
            hotelRoomFilter,
            { checkIn: { gte: period.start, lte: period.end } },
            {
              OR: [
                {
                  source: BOOKING_SOURCE.PLATFORM,
                  status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.COMPLETED] }
                },
                {
                  source: BOOKING_SOURCE.OWNER_MANUAL,
                  offlineStatus: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] }
                }
              ]
            }
          ]
        }
      }),
      prisma.booking.count({
        where: {
          AND: [
            hotelRoomFilter,
            { checkOut: { gte: period.start, lte: period.end } },
            {
              OR: [
                {
                  source: BOOKING_SOURCE.PLATFORM,
                  status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.COMPLETED] }
                },
                {
                  source: BOOKING_SOURCE.OWNER_MANUAL,
                  offlineStatus: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] }
                }
              ]
            }
          ]
        }
      }),
      prisma.hotelExpense.findMany({
        where: { hotelId: hotel.id, status: { in: ["ACTIVE", "STOPPED"] } },
        select: {
          id: true,
          title: true,
          category: true,
          recurrence: true,
          status: true,
          versions: {
            select: {
              amount: true,
              effectiveFrom: true,
              effectiveUntil: true
            }
          }
        }
      })
    ]);

  let revenueTotal = 0;
  let cash = 0;
  let card = 0;
  let other = 0;
  let onlineRev = 0;
  let offlineRev = 0;
  let unknownRev = 0;
  let onlineCount = 0;
  let offlineCount = 0;
  let unknownCount = 0;

  const contributing: HotelAnalyticsDto["contributing"] = [];

  for (const b of paidBookings) {
    const minor = toMinor(b.totalPrice);
    const channel = bookingChannelFromSource(b.source);
    const settlement = resolveSettlementChannel({
      settlementChannel: b.settlementChannel,
      offlinePaymentType: b.offlinePaymentType,
      hotelPaymentMethodType: b.hotelPaymentMethod?.type,
      paymentMethod: b.paymentMethod,
      payOnArrival: b.payOnArrival
    });
    const bucket = settlementBucket(settlement);

    revenueTotal += minor;
    if (bucket === "cash") cash += minor;
    else if (bucket === "card") card += minor;
    else other += minor;

    if (channel === "online") {
      onlineRev += minor;
      onlineCount += 1;
    } else if (channel === "offline") {
      offlineRev += minor;
      offlineCount += 1;
    } else {
      unknownRev += minor;
      unknownCount += 1;
    }

    if (opts.includeContributing !== false && contributing.length < 100) {
      contributing.push({
        id: b.id,
        publicCode: b.publicCode,
        guest: b.guestName?.trim() || b.user?.name?.trim() || b.guestPhone || b.user?.phone || "—",
        source: b.source,
        channel,
        settlement,
        amount: fromMinor(minor),
        checkIn: b.checkIn.toISOString(),
        checkOut: b.checkOut.toISOString(),
        recognizedAt: (b.revenueRecognizedAt ?? b.checkIn).toISOString()
      });
    }
  }

  const versionRows = expenseRows.flatMap((e) =>
    e.versions.map((v) => ({
      expenseId: e.id,
      amount: v.amount,
      effectiveFrom: v.effectiveFrom,
      effectiveUntil: v.effectiveUntil,
      recurrence: e.recurrence,
      category: e.category,
      title: e.title,
      status: e.status
    }))
  );
  const allocated = allocateExpenseVersionsToPeriod(versionRows, period.start, period.end);

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    period: {
      key: period.key,
      start: period.start.toISOString(),
      end: period.end.toISOString()
    },
    revenue: {
      total: fromMinor(revenueTotal),
      cash: fromMinor(cash),
      card: fromMinor(card),
      other: fromMinor(other),
      online: fromMinor(onlineRev),
      offline: fromMinor(offlineRev),
      unknownSource: fromMinor(unknownRev)
    },
    expenses: {
      total: fromMinor(allocated.totalMinor),
      byCategory: Object.entries(allocated.byCategory)
        .map(([category, amount]) => ({ category, amount: fromMinor(amount) }))
        .sort((a, b) => b.amount - a.amount)
    },
    netProfit: fromMinor(revenueTotal - allocated.totalMinor),
    bookings: {
      onlineCount,
      offlineCount,
      unknownCount,
      pendingConfirmation,
      cancellationsInPeriod
    },
    ops: {
      checkInsInPeriod: checkIns,
      checkOutsInPeriod: checkOuts
    },
    contributing
  };
}

/** Mark booking revenue recognized — call inside payment→PAID transitions. */
export async function markBookingRevenueRecognized(
  bookingId: number,
  opts: { at?: Date; settlementChannel?: SettlementChannel | null } = {}
) {
  const at = opts.at ?? new Date();
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      settlementChannel: true,
      offlinePaymentType: true,
      paymentMethod: true,
      payOnArrival: true,
      hotelPaymentMethod: { select: { type: true } },
      revenueRecognizedAt: true
    }
  });
  if (!existing) return;

  const channel =
    opts.settlementChannel ??
    resolveSettlementChannel({
      settlementChannel: existing.settlementChannel,
      offlinePaymentType: existing.offlinePaymentType,
      hotelPaymentMethodType: existing.hotelPaymentMethod?.type,
      paymentMethod: existing.paymentMethod,
      payOnArrival: existing.payOnArrival
    });

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      revenueRecognizedAt: existing.revenueRecognizedAt ?? at,
      settlementChannel: channel === SETTLEMENT_CHANNEL.UNKNOWN ? existing.settlementChannel : channel
    }
  });
}
