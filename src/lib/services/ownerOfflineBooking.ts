import { prisma } from "@/lib/prisma";
import { assertDatesAvailable, DatesUnavailableError, withRoomOverlapGuard } from "@/lib/booking/availability";
import {
  assertRoomTypeAvailable,
  findAvailablePhysicalRoom,
  RoomTypeUnavailableError,
  withRoomTypeCapacityGuard
} from "@/lib/pms/inventory";
import {
  BOOKING_SOURCE,
  BOOKING_STATUS,
  OFFLINE_STATUS,
  isOfflineBookingSource,
  type OfflineStatus
} from "@/lib/domain/booking";
import { createNotification } from "@/lib/notifications/create";
import { generateBookingCode } from "@/lib/services/bookingCode";
import { normalizePhone } from "@/lib/validation/phone";
import { normalizeSettlementChannel, SETTLEMENT_CHANNEL } from "@/lib/owner/analytics/settlement";
import { markBookingRevenueRecognized } from "@/lib/owner/analytics/getHotelAnalytics";
import { writeOwnerHotelAudit } from "@/lib/owner/analytics/audit";
import { quoteOfflineStayTotal } from "@/lib/services/offlinePricing";

const OFFLINE_STATUSES = new Set<string>(Object.values(OFFLINE_STATUS));

export async function assertRoomOwnedByOwner(roomId: number, ownerId: number) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, hotel: { ownerId } },
    include: { hotel: true }
  });
  if (!room) return null;
  return room;
}

export type CreateManualOfflineBookingInput = {
  /** Actor creating the booking (Owner or Manager user id). */
  actorUserId: number;
  actorRole: "OWNER" | "MANAGER";
  hotelId: number;
  roomTypeId: number;
  roomId?: number | null;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestCount?: number;
  /** If omitted, authoritative price from category × nights. */
  totalPrice?: number | null;
  prepayment?: number | null;
  offlinePaymentType?: string | null;
  offlineNote?: string | null;
  offlineStatus?: OfflineStatus;
  /** When true and settlement is CASH/CARD with full prepayment, mark PAID. */
  markPaid?: boolean;
};

/**
 * Canonical offline booking create for Owner and Manager.
 * Source = OWNER_MANUAL | MANAGER_MANUAL (channel), settlement = CASH|CARD (payment dimension).
 * Uses the same physical-room EXCLUDE / RoomType capacity guards as online booking.
 */
export async function createManualOfflineBooking(input: CreateManualOfflineBookingInput) {
  const guestPhone = normalizePhone(input.guestPhone);
  if (!guestPhone) throw new Error("invalid_phone");
  if (input.checkOut.getTime() <= input.checkIn.getTime()) throw new Error("invalid_dates");

  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, hotelId: input.hotelId },
    include: { hotel: true }
  });
  if (!roomType) throw new Error("forbidden");
  if (roomType.hotel.status !== "APPROVED") throw new Error("hotel_not_available");

  if (input.actorRole === "OWNER" && roomType.hotel.ownerId !== input.actorUserId) {
    throw new Error("forbidden");
  }

  const guestCount = Math.max(1, input.guestCount ?? 1);
  if (guestCount > roomType.maxGuests) throw new Error("guest_capacity");

  let physicalRoomId = input.roomId ?? null;
  if (physicalRoomId) {
    const room = await prisma.room.findFirst({
      where: { id: physicalRoomId, hotelId: input.hotelId, roomTypeId: roomType.id }
    });
    if (!room) throw new Error("room_type_mismatch");
  } else {
    // Prefer a concrete physical room so EXCLUDE + Owner calendar room cells stay consistent.
    // Type-capacity path remains as fallback when every sellable room is occupied/blocked.
    physicalRoomId = await findAvailablePhysicalRoom({
      roomTypeId: roomType.id,
      checkIn: input.checkIn,
      checkOut: input.checkOut
    });
  }

  const quoted = quoteOfflineStayTotal({
    basePrice: Number(roomType.basePrice),
    checkIn: input.checkIn,
    checkOut: input.checkOut
  });
  // Manager must not invent price; Owner legacy form may still pass totalPrice — prefer quote when missing/invalid.
  const totalPrice =
    input.totalPrice != null && Number(input.totalPrice) > 0
      ? input.actorRole === "OWNER"
        ? Math.max(0, Number(input.totalPrice))
        : quoted
      : quoted;
  if (input.actorRole === "MANAGER" && input.totalPrice != null && Math.abs(Number(input.totalPrice) - quoted) > 0.01) {
    // Ignore override — authoritative quote wins (no silent Manager price override).
  }

  const prepayment =
    input.prepayment != null
      ? Math.max(0, Number(input.prepayment))
      : input.markPaid
        ? totalPrice
        : 0;
  const remainingAmount = Math.max(0, totalPrice - prepayment);
  const offlineStatus = input.offlineStatus ?? OFFLINE_STATUS.CONFIRMED;
  if (!OFFLINE_STATUSES.has(offlineStatus)) throw new Error("invalid_status");

  const publicCode = await generateBookingCode();
  const settlementRaw = normalizeSettlementChannel(input.offlinePaymentType);
  const settlement =
    settlementRaw === SETTLEMENT_CHANNEL.UNKNOWN ? SETTLEMENT_CHANNEL.CASH : settlementRaw;
  const paidNow = prepayment >= totalPrice && totalPrice > 0;

  const source =
    input.actorRole === "MANAGER" ? BOOKING_SOURCE.MANAGER_MANUAL : BOOKING_SOURCE.OWNER_MANUAL;

  const createData = {
    source,
    createdByOwnerId: input.actorRole === "OWNER" ? input.actorUserId : null,
    userId: null,
    roomTypeId: input.roomTypeId,
    roomId: physicalRoomId,
    assignedRoomId: physicalRoomId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestName: input.guestName.trim(),
    guestPhone,
    guestEmail: input.guestEmail?.trim() || null,
    guestCount,
    phone: guestPhone,
    offlineNote: input.offlineNote?.trim() || null,
    offlineStatus,
    prepayment,
    remainingAmount,
    offlinePaymentType: settlement,
    settlementChannel: settlement,
    totalPrice,
    commission: 0,
    subtotal: totalPrice,
    serviceFee: 0,
    taxAmount: 0,
    publicCode,
    status: BOOKING_STATUS.CONFIRMED,
    paymentStatus: paidNow ? "PAID" : "PENDING",
    revenueRecognizedAt: paidNow ? new Date() : null,
    payOnArrival: !paidNow,
    paymentMethod: settlement === SETTLEMENT_CHANNEL.CASH ? "ARRIVAL" : settlement
  } as const;

  let booking;
  try {
    if (physicalRoomId) {
      await assertDatesAvailable({ roomId: physicalRoomId, checkIn: input.checkIn, checkOut: input.checkOut });
      booking = await withRoomOverlapGuard(() => prisma.booking.create({ data: createData }));
    } else {
      booking = await withRoomTypeCapacityGuard(input.roomTypeId, async (tx) => {
        await assertRoomTypeAvailable({
          roomTypeId: input.roomTypeId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          client: tx
        });
        return tx.booking.create({ data: createData });
      });
    }
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) throw new Error("dates_unavailable");
    throw e;
  }

  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: "offline_booking.created",
    entityType: "Booking",
    entityId: booking.id,
    afterState: {
      publicCode: booking.publicCode,
      source,
      settlement,
      totalPrice,
      paymentStatus: booking.paymentStatus
    }
  });

  if (input.actorRole === "OWNER") {
    await createNotification({
      userId: input.actorUserId,
      type: "OWNER_OFFLINE_BOOKING_CREATED",
      bookingId: booking.id,
      link: `/dashboard/owner?section=offline-bookings`,
      meta: { roomTypeId: input.roomTypeId, roomId: physicalRoomId, publicCode }
    });
  } else {
    // Notify hotel owner that Manager created an offline booking.
    await createNotification({
      userId: roomType.hotel.ownerId,
      type: "OWNER_OFFLINE_BOOKING_CREATED",
      bookingId: booking.id,
      link: `/dashboard/owner?section=offline-bookings&hotelId=${input.hotelId}`,
      meta: { roomTypeId: input.roomTypeId, roomId: physicalRoomId, publicCode, byManagerId: input.actorUserId }
    });
  }

  if (paidNow) {
    await markBookingRevenueRecognized(booking.id, { settlementChannel: settlement });
  }

  return booking;
}

/** @deprecated Prefer createManualOfflineBooking — kept for Owner form compatibility. */
export type CreateOfflineBookingInput = {
  ownerId: number;
  roomTypeId: number;
  roomId?: number | null;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestCount?: number;
  totalPrice: number;
  prepayment?: number | null;
  offlinePaymentType?: string | null;
  offlineNote?: string | null;
  offlineStatus?: OfflineStatus;
};

export async function createOwnerOfflineBooking(input: CreateOfflineBookingInput) {
  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, hotel: { ownerId: input.ownerId } },
    select: { hotelId: true }
  });
  if (!roomType) throw new Error("forbidden");
  return createManualOfflineBooking({
    actorUserId: input.ownerId,
    actorRole: "OWNER",
    hotelId: roomType.hotelId,
    roomTypeId: input.roomTypeId,
    roomId: input.roomId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestEmail: input.guestEmail,
    guestCount: input.guestCount,
    totalPrice: input.totalPrice,
    prepayment: input.prepayment,
    offlinePaymentType: input.offlinePaymentType,
    offlineNote: input.offlineNote,
    offlineStatus: input.offlineStatus
  });
}

export type UpdateOfflineBookingInput = {
  ownerId: number;
  bookingId: number;
  offlineStatus?: OfflineStatus;
  totalPrice?: number;
  prepayment?: number | null;
  offlinePaymentType?: string | null;
  offlineNote?: string | null;
  checkIn?: Date;
  checkOut?: Date;
};

export async function updateOwnerOfflineBooking(input: UpdateOfflineBookingInput) {
  const existing = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      source: { in: [BOOKING_SOURCE.OWNER_MANUAL, BOOKING_SOURCE.MANAGER_MANUAL] },
      OR: [
        { room: { hotel: { ownerId: input.ownerId } } },
        { roomType: { hotel: { ownerId: input.ownerId } } },
        { assignedRoom: { hotel: { ownerId: input.ownerId } } }
      ]
    }
  });
  if (!existing || !isOfflineBookingSource(existing.source)) throw new Error("not_found");

  const checkIn = input.checkIn ?? existing.checkIn;
  const checkOut = input.checkOut ?? existing.checkOut;
  if (checkOut.getTime() <= checkIn.getTime()) throw new Error("invalid_dates");

  const physicalId = existing.assignedRoomId ?? existing.roomId;
  if ((input.checkIn || input.checkOut) && physicalId) {
    try {
      await assertDatesAvailable({ roomId: physicalId, checkIn, checkOut, excludeBookingId: existing.id });
    } catch (e) {
      if (e instanceof DatesUnavailableError) throw new Error("dates_unavailable");
      throw e;
    }
  }

  const totalPrice = input.totalPrice != null ? Math.max(0, Number(input.totalPrice)) : Number(existing.totalPrice);
  const prepayment =
    input.prepayment !== undefined
      ? input.prepayment != null
        ? Math.max(0, Number(input.prepayment))
        : 0
      : existing.prepayment != null
        ? Number(existing.prepayment)
        : 0;
  const remainingAmount = Math.max(0, totalPrice - prepayment);

  let offlineStatus = existing.offlineStatus;
  if (input.offlineStatus) {
    if (!OFFLINE_STATUSES.has(input.offlineStatus)) throw new Error("invalid_status");
    offlineStatus = input.offlineStatus;
  }

  if (offlineStatus === OFFLINE_STATUS.CHECKED_OUT && physicalId) {
    await prisma.room.update({
      where: { id: physicalId },
      data: { housekeepingStatus: "DIRTY" }
    });
  }

  const updateData = {
    checkIn,
    checkOut,
    offlineStatus,
    totalPrice,
    subtotal: totalPrice,
    prepayment,
    remainingAmount,
    offlinePaymentType:
      input.offlinePaymentType !== undefined ? input.offlinePaymentType?.trim() || null : existing.offlinePaymentType,
    offlineNote: input.offlineNote !== undefined ? input.offlineNote?.trim() || null : existing.offlineNote,
    paymentStatus: prepayment >= totalPrice && totalPrice > 0 ? "PAID" : "PENDING"
  } as const;

  try {
    if (physicalId) {
      return await withRoomOverlapGuard(() => prisma.booking.update({ where: { id: existing.id }, data: updateData }));
    }
    if (existing.roomTypeId) {
      const roomTypeId = existing.roomTypeId;
      return await withRoomTypeCapacityGuard(roomTypeId, async (tx) => {
        await assertRoomTypeAvailable({ roomTypeId, checkIn, checkOut, excludeBookingId: existing.id, client: tx });
        return tx.booking.update({ where: { id: existing.id }, data: updateData });
      });
    }
    return await prisma.booking.update({ where: { id: existing.id }, data: updateData });
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) throw new Error("dates_unavailable");
    throw e;
  }
}
