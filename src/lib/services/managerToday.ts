import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS, isOfflineBookingSource, OFFLINE_STATUS } from "@/lib/domain/booking";
import { hotelBookingWhere } from "@/lib/pms/ownerQueries";

/**
 * Business "today" for hotel operations.
 * Source of truth: Asia/Dushanbe calendar date (Tajikistan), not the browser timezone.
 * Documented: hotel timezone is not per-hotel yet — platform default Asia/Dushanbe.
 */
export const HOTEL_BUSINESS_TZ = "Asia/Dushanbe";

export function businessTodayYmd(now = new Date(), timeZone = HOTEL_BUSINESS_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

function ymdFromUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isOnlineActive(status: string) {
  return (
    status === BOOKING_STATUS.CONFIRMED ||
    status === BOOKING_STATUS.CHECKED_IN ||
    status === BOOKING_STATUS.COMPLETED
  );
}

function isOfflineActive(offlineStatus: string | null) {
  return (
    offlineStatus === OFFLINE_STATUS.CONFIRMED ||
    offlineStatus === OFFLINE_STATUS.CHECKED_IN ||
    offlineStatus === OFFLINE_STATUS.CHECKED_OUT
  );
}

function bookingCountsForStay(b: { source: string; status: string; offlineStatus: string | null }) {
  if (isOfflineBookingSource(b.source)) {
    return b.offlineStatus !== OFFLINE_STATUS.CANCELLED && b.offlineStatus !== OFFLINE_STATUS.PENDING;
  }
  return (
    b.status !== BOOKING_STATUS.CANCELLED &&
    b.status !== BOOKING_STATUS.REJECTED &&
    b.status !== BOOKING_STATUS.EXPIRED &&
    b.status !== BOOKING_STATUS.WAITING_PAYMENT &&
    b.status !== BOOKING_STATUS.WAIT_PROOF
  );
}

export async function getHotelTodayBoard(hotelId: number, now = new Date()) {
  const todayYmd = businessTodayYmd(now);
  const dayStart = new Date(`${todayYmd}T00:00:00.000Z`);
  const dayEnd = new Date(`${todayYmd}T23:59:59.999Z`);
  // Span window: checkIn <= today < checkOut → need bookings overlapping today
  const nextDay = new Date(dayStart);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const rows = await prisma.booking.findMany({
    where: {
      AND: [
        hotelBookingWhere(hotelId),
        {
          OR: [
            { checkIn: { gte: dayStart, lte: dayEnd } },
            { checkOut: { gte: dayStart, lte: dayEnd } },
            { AND: [{ checkIn: { lte: dayStart } }, { checkOut: { gt: dayStart } }] }
          ]
        }
      ]
    },
    include: {
      roomType: { select: { id: true, name: true } },
      assignedRoom: { select: { id: true, roomNumber: true, title: true } },
      room: { select: { id: true, roomNumber: true, title: true } },
      user: { select: { name: true, phone: true } }
    },
    orderBy: { checkIn: "asc" }
  });

  const arrivals = [];
  const departures = [];
  const inHouse = [];

  for (const b of rows) {
    if (!bookingCountsForStay(b)) continue;
    const inYmd = ymdFromUtcDate(b.checkIn);
    const outYmd = ymdFromUtcDate(b.checkOut);
    const card = {
      id: b.id,
      publicCode: b.publicCode,
      guestName: b.guestName ?? b.user?.name ?? "—",
      guestPhone: b.guestPhone ?? b.user?.phone ?? b.phone,
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString(),
      paymentStatus: b.paymentStatus,
      status: b.status,
      offlineStatus: b.offlineStatus,
      source: b.source,
      payOnArrival: b.payOnArrival,
      roomLabel:
        b.assignedRoom?.roomNumber ||
        b.room?.roomNumber ||
        b.roomType?.name ||
        "—",
      categoryName: b.roomType?.name ?? null,
      totalPrice: Number(b.totalPrice)
    };

    if (inYmd === todayYmd && (isOfflineBookingSource(b.source) ? isOfflineActive(b.offlineStatus) || b.offlineStatus === OFFLINE_STATUS.CONFIRMED : isOnlineActive(b.status) || b.status === BOOKING_STATUS.PENDING_OWNER || b.status === BOOKING_STATUS.CONFIRMED)) {
      arrivals.push(card);
    }
    if (outYmd === todayYmd) {
      departures.push(card);
    }
    // In-house: checkIn <= today AND today < checkOut, active stay
    if (inYmd <= todayYmd && todayYmd < outYmd) {
      const living =
        isOfflineBookingSource(b.source)
          ? b.offlineStatus === OFFLINE_STATUS.CHECKED_IN || b.offlineStatus === OFFLINE_STATUS.CONFIRMED
          : b.status === BOOKING_STATUS.CHECKED_IN || b.status === BOOKING_STATUS.CONFIRMED;
      if (living) inHouse.push(card);
    }
  }

  return {
    businessDate: todayYmd,
    timeZone: HOTEL_BUSINESS_TZ,
    arrivals,
    departures,
    inHouse,
    counts: {
      arrivals: arrivals.length,
      departures: departures.length,
      inHouse: inHouse.length
    }
  };
}
