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
import { getBookingGuestLabel, isOfflineBookingSource } from "@/lib/domain/booking";
import { getRoomTypeDaySummary } from "@/lib/pms/inventory";

export type CalendarCellKind = "available" | "blocked" | "occupied" | "pending";

export type RoomTypeCalendarRow = {
  id: number;
  name: string;
  hotelName: string;
  cells: Record<string, { available: number; total: number }>;
};

export type CalendarCellMeta = {
  bookingId?: number;
  publicCode?: string | null;
  status?: string;
  paymentStatus?: string | null;
  source?: string | null;
  guestLabel?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  totalPrice?: string;
  hotelName?: string;
  roomTitle?: string;
};

export function toUtcDayStart(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0));
}

export function dayKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

/** Occupancy status only — online/offline is source metadata, not a calendar status. */
function classifyBooking(b: {
  source: string;
  status: string;
  offlineStatus: string | null;
}): "occupied" | "pending" | null {
  if (isOfflineBookingSource(b.source)) {
    if (isOccupyingOfflineStatus(b.offlineStatus)) return "occupied";
    if (isPendingOfflineStatus(b.offlineStatus)) return "pending";
    return null;
  }
  if (isOccupyingOnlineStatus(b.status)) return "occupied";
  if (isPendingOnlineStatus(b.status)) return "pending";
  return null;
}

export async function getOwnerCalendarData(ownerId: number, days = 30, hotelId?: number) {
  const start = toUtcDayStart(new Date());
  const end = addDays(start, days);
  const hotelFilter = hotelId ? { id: hotelId, ownerId } : { ownerId, status: "APPROVED" };

  const rooms = await prisma.room.findMany({
    where: { hotel: hotelFilter },
    include: { hotel: true, roomType: true },
    orderBy: [{ hotelId: "asc" }, { roomNumber: "asc" }, { id: "asc" }]
  });

  const roomTypes = await prisma.roomType.findMany({
    where: { hotel: hotelFilter },
    include: { hotel: true },
    orderBy: [{ hotelId: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
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
        OR: [{ roomId: { in: roomIds } }, { assignedRoomId: { in: roomIds } }],
        checkIn: { lt: end },
        checkOut: { gt: start }
      },
      select: {
        id: true,
        roomId: true,
        assignedRoomId: true,
        roomTypeId: true,
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
        paymentStatus: true,
        room: { select: { title: true, hotel: { select: { name: true } } } },
        user: { select: { name: true, phone: true } }
      },
      orderBy: { checkIn: "asc" }
    })
  ]);

  const bookingsByRoom = new Map<number, typeof bookingsRaw>();
  for (const b of bookingsRaw) {
    const rid = b.assignedRoomId ?? b.roomId;
    if (!rid) continue;
    const list = bookingsByRoom.get(rid) ?? [];
    list.push(b);
    bookingsByRoom.set(rid, list);
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

      const occupying = hits.find((b) => classifyBooking(b) === "occupied");
      const pending = !occupying ? hits.find((b) => classifyBooking(b) === "pending") : null;
      const hit = occupying ?? pending;

      if (hit) {
        const kind = classifyBooking(hit)!;
        cells[cellKey] = kind;
        cellMeta[cellKey] = {
          bookingId: hit.id,
          publicCode: hit.publicCode,
          status: isOfflineBookingSource(hit.source) ? hit.offlineStatus ?? hit.status : hit.status,
          paymentStatus: hit.paymentStatus,
          source: hit.source,
          guestLabel: getBookingGuestLabel(hit),
          guestPhone: hit.guestPhone ?? hit.phone ?? hit.user?.phone ?? undefined,
          checkIn: hit.checkIn.toISOString().slice(0, 10),
          checkOut: hit.checkOut.toISOString().slice(0, 10),
          totalPrice: String(hit.totalPrice),
          hotelName: hit.room?.hotel?.name ?? room.hotel.name,
          roomTitle: hit.room?.title ?? room.title
        };
        continue;
      }

      // customPrice overrides are pricing ops — not occupancy status
      cells[cellKey] = "available";
    }
  }

  const bookings = bookingsRaw.filter((b) => classifyBooking(b) === "occupied");

  const typeRows: RoomTypeCalendarRow[] = [];
  for (const rt of roomTypes) {
    const cells: Record<string, { available: number; total: number }> = {};
    for (const { key } of calendarDays) {
      const dayDate = new Date(`${key}T00:00:00.000Z`);
      const summary = await getRoomTypeDaySummary(rt.id, dayDate);
      cells[key] = { available: summary.available, total: summary.total };
    }
    typeRows.push({
      id: rt.id,
      name: rt.name,
      hotelName: rt.hotel.name,
      cells
    });
  }

  return { rooms, roomTypes, typeRows, days: calendarDays, cells, cellMeta, overrides, bookings };
}
