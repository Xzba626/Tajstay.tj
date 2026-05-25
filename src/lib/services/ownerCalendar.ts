import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  bookingOccupiesDay,
  getRoomBookingsInRange,
  isOccupyingOfflineStatus,
  isOccupyingOnlineStatus,
  isPendingOfflineStatus,
  isPendingOnlineStatus
} from "@/lib/booking/availability";
import { BOOKING_SOURCE, getBookingGuestLabel } from "@/lib/domain/booking";

export type CalendarCellKind = "available" | "blocked" | "customPrice" | "online" | "offline" | "onlinePending";

export type CalendarCellMeta = {
  bookingId?: number;
  publicCode?: string | null;
  status?: string;
  guestLabel?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  totalPrice?: string;
  hotelName?: string;
  roomTitle?: string;
  customPrice?: string | null;
};

export function toUtcDayStart(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0));
}

export function dayKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function classifyBooking(
  b: {
    source: string;
    status: string;
    offlineStatus: string | null;
  }
): "online" | "offline" | "onlinePending" | null {
  if (b.source === BOOKING_SOURCE.OWNER_MANUAL) {
    if (isOccupyingOfflineStatus(b.offlineStatus)) return "offline";
    if (isPendingOfflineStatus(b.offlineStatus)) return "onlinePending";
    return null;
  }
  if (isOccupyingOnlineStatus(b.status)) return "online";
  if (isPendingOnlineStatus(b.status)) return "onlinePending";
  return null;
}

export async function getOwnerCalendarData(ownerId: number, days = 30) {
  const start = toUtcDayStart(new Date());
  const end = addDays(start, days);

  const rooms = await prisma.room.findMany({
    where: { hotel: { ownerId } },
    include: { hotel: true },
    orderBy: [{ hotelId: "asc" }, { id: "asc" }]
  });

  const roomIds = rooms.map((r) => r.id);
  if (!roomIds.length) {
    return {
      rooms: [],
      days: [],
      cells: {} as Record<string, CalendarCellKind>,
      cellMeta: {} as Record<string, CalendarCellMeta>,
      bookings: [] as Awaited<ReturnType<typeof prisma.booking.findMany>>
    };
  }

  const [overrides, bookingsRaw] = await Promise.all([
    prisma.roomDateOverride.findMany({
      where: { roomId: { in: roomIds }, date: { gte: start, lt: end } },
      select: { roomId: true, date: true, isBlocked: true, customPrice: true }
    }),
    prisma.booking.findMany({
      where: {
        roomId: { in: roomIds },
        checkIn: { lt: end },
        checkOut: { gt: start }
      },
      select: {
        id: true,
        roomId: true,
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
        room: { select: { title: true, hotel: { select: { name: true } } } },
        user: { select: { name: true, phone: true } }
      },
      orderBy: { checkIn: "asc" }
    })
  ]);

  const bookingsByRoom = new Map<number, typeof bookingsRaw>();
  for (const b of bookingsRaw) {
    const list = bookingsByRoom.get(b.roomId) ?? [];
    list.push(b);
    bookingsByRoom.set(b.roomId, list);
  }

  const calendarDays = Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i);
    return { key: dayKey(d), day: d.getUTCDate(), month: d.getUTCMonth() + 1 };
  });

  const overrideByKey = new Map<string, { isBlocked: boolean; customPrice: unknown }>();
  for (const o of overrides) {
    overrideByKey.set(`${o.roomId}|${dayKey(o.date)}`, {
      isBlocked: o.isBlocked,
      customPrice: o.customPrice
    });
  }

  const cells: Record<string, CalendarCellKind> = {};
  const cellMeta: Record<string, CalendarCellMeta> = {};

  for (const room of rooms) {
    const roomBookings = bookingsByRoom.get(room.id) ?? [];
    for (const { key } of calendarDays) {
      const cellKey = `${room.id}|${key}`;
      const ov = overrideByKey.get(cellKey);
      if (ov?.isBlocked) {
        cells[cellKey] = "blocked";
        continue;
      }

      const dayDate = new Date(`${key}T00:00:00.000Z`);
      const hits = roomBookings.filter((b) => bookingOccupiesDay(b.checkIn, b.checkOut, dayDate));

      const occupying = hits.find((b) => {
        const kind = classifyBooking(b);
        return kind === "online" || kind === "offline";
      });
      const pending = !occupying
        ? hits.find((b) => classifyBooking(b) === "onlinePending")
        : null;
      const hit = occupying ?? pending;

      if (hit) {
        const kind = classifyBooking(hit)!;
        cells[cellKey] = kind;
        cellMeta[cellKey] = {
          bookingId: hit.id,
          publicCode: hit.publicCode,
          status: hit.source === BOOKING_SOURCE.OWNER_MANUAL ? hit.offlineStatus ?? hit.status : hit.status,
          guestLabel: getBookingGuestLabel(hit),
          guestPhone: hit.guestPhone ?? hit.phone ?? hit.user?.phone ?? undefined,
          checkIn: hit.checkIn.toISOString().slice(0, 10),
          checkOut: hit.checkOut.toISOString().slice(0, 10),
          totalPrice: String(hit.totalPrice),
          hotelName: hit.room.hotel.name,
          roomTitle: hit.room.title
        };
        continue;
      }

      if (ov?.customPrice != null) {
        cells[cellKey] = "customPrice";
        cellMeta[cellKey] = { customPrice: String(ov.customPrice) };
        continue;
      }

      cells[cellKey] = "available";
    }
  }

  const bookings = bookingsRaw.filter((b) => {
    const kind = classifyBooking(b);
    return kind === "online" || kind === "offline";
  });

  return { rooms, days: calendarDays, cells, cellMeta, overrides, bookings };
}
