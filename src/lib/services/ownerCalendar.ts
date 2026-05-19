import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getRoomBookingsInRange } from "@/lib/booking/availability";
import { BOOKING_SOURCE } from "@/lib/domain/booking";

export type CalendarCellKind = "available" | "blocked" | "customPrice" | "online" | "offline" | "onlinePending";

export function toUtcDayStart(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0));
}

export function dayKey(input: Date): string {
  return input.toISOString().slice(0, 10);
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
    return { rooms: [], days: [], cells: {} as Record<string, CalendarCellKind> };
  }

  const [overrides, bookings] = await Promise.all([
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
        room: { select: { title: true, hotel: { select: { name: true } } } }
      },
      orderBy: { checkIn: "asc" }
    })
  ]);

  const blockingBookingsByRoom = new Map<number, Awaited<ReturnType<typeof getRoomBookingsInRange>>>();
  for (const roomId of roomIds) {
    blockingBookingsByRoom.set(roomId, await getRoomBookingsInRange(roomId, start, end));
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

  for (const room of rooms) {
    const blocking = blockingBookingsByRoom.get(room.id) ?? [];
    for (const { key } of calendarDays) {
      const cellKey = `${room.id}|${key}`;
      const ov = overrideByKey.get(cellKey);
      if (ov?.isBlocked) {
        cells[cellKey] = "blocked";
        continue;
      }
      if (ov?.customPrice != null) {
        cells[cellKey] = "customPrice";
      }

      const dayDate = new Date(`${key}T00:00:00.000Z`);
      const nextDay = addDays(dayDate, 1);

      const hit = blocking.find((b) => {
        const bIn = toUtcDayStart(new Date(b.checkIn));
        const bOut = toUtcDayStart(new Date(b.checkOut));
        return bIn.getTime() < nextDay.getTime() && bOut.getTime() > dayDate.getTime();
      });

      if (hit) {
        if (hit.source === BOOKING_SOURCE.OWNER_MANUAL) {
          cells[cellKey] = "offline";
        } else if (
          hit.status === "WAIT_PROOF" ||
          hit.status === "ON_REVIEW" ||
          hit.status === "PENDING_OWNER" ||
          hit.status === "WAITING_PAYMENT"
        ) {
          cells[cellKey] = "onlinePending";
        } else {
          cells[cellKey] = "online";
        }
        continue;
      }

      if (!cells[cellKey]) cells[cellKey] = "available";
    }
  }

  return { rooms, days: calendarDays, cells, overrides, bookings };
}
