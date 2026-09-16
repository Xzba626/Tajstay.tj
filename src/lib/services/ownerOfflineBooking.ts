import { prisma } from "@/lib/prisma";
import { assertDatesAvailable, DatesUnavailableError, withRoomOverlapGuard } from "@/lib/booking/availability";
import { assertRoomTypeAvailable, RoomTypeUnavailableError, withRoomTypeCapacityGuard } from "@/lib/pms/inventory";
import { BOOKING_SOURCE, BOOKING_STATUS, OFFLINE_STATUS, type OfflineStatus } from "@/lib/domain/booking";
import { createNotification } from "@/lib/notifications/create";
import { generateBookingCode } from "@/lib/services/bookingCode";
import { normalizePhone } from "@/lib/validation/phone";
import { normalizeSettlementChannel, SETTLEMENT_CHANNEL } from "@/lib/owner/analytics/settlement";
import { markBookingRevenueRecognized } from "@/lib/owner/analytics/getHotelAnalytics";

const OFFLINE_STATUSES = new Set<string>(Object.values(OFFLINE_STATUS));

export async function assertRoomOwnedByOwner(roomId: number, ownerId: number) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, hotel: { ownerId } },
    include: { hotel: true }
  });
  if (!room) return null;
  return room;
}

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
  const guestPhone = normalizePhone(input.guestPhone);
  if (!guestPhone) throw new Error("invalid_phone");

  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, hotel: { ownerId: input.ownerId } },
    include: { hotel: true }
  });
  if (!roomType) throw new Error("forbidden");
  if (roomType.hotel.status !== "APPROVED") throw new Error("hotel_not_available");

  let physicalRoomId = input.roomId ?? null;
  if (physicalRoomId) {
    const room = await assertRoomOwnedByOwner(physicalRoomId, input.ownerId);
    if (!room || room.roomTypeId !== roomType.id) throw new Error("room_type_mismatch");
  }

  const prepayment = input.prepayment != null ? Math.max(0, Number(input.prepayment)) : 0;
  const totalPrice = Math.max(0, Number(input.totalPrice));
  const remainingAmount = Math.max(0, totalPrice - prepayment);
  const offlineStatus = input.offlineStatus ?? OFFLINE_STATUS.CONFIRMED;
  if (!OFFLINE_STATUSES.has(offlineStatus)) throw new Error("invalid_status");

  const publicCode = await generateBookingCode();
  const guestCount = Math.max(1, input.guestCount ?? 1);
  const settlementRaw = normalizeSettlementChannel(input.offlinePaymentType);
  const settlement =
    settlementRaw === SETTLEMENT_CHANNEL.UNKNOWN ? SETTLEMENT_CHANNEL.CASH : settlementRaw;
  const paidNow = prepayment >= totalPrice && totalPrice > 0;

  const createData = {
    source: BOOKING_SOURCE.OWNER_MANUAL,
    createdByOwnerId: input.ownerId,
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
    payOnArrival: true,
    paymentMethod: settlement === SETTLEMENT_CHANNEL.CASH ? "ARRIVAL" : settlement
  } as const;

  // Check-then-create folded into one atomic operation - a new offline booking defaults straight
  // into CONFIRMED (occupying), so the old separate SELECT-then-INSERT was a genuine race point
  // (proven live, see Block 2 report). Physical room: withRoomOverlapGuard (DB EXCLUDE
  // constraint). RoomType-only (no physical room yet): withRoomTypeCapacityGuard (per-roomType
  // advisory lock + re-check inside the same transaction) - the EXCLUDE constraint has no column
  // to range-exclude on for an unassigned booking, see Block 2.1 report.
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

  await createNotification({
    userId: input.ownerId,
    type: "OWNER_OFFLINE_BOOKING_CREATED",
    bookingId: booking.id,
    link: `/dashboard/owner?section=offline-bookings`,
    meta: { roomTypeId: input.roomTypeId, roomId: physicalRoomId, publicCode }
  });

  if (paidNow) {
    await markBookingRevenueRecognized(booking.id, { settlementChannel: settlement });
  }

  return booking;
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
      source: BOOKING_SOURCE.OWNER_MANUAL,
      room: { hotel: { ownerId: input.ownerId } }
    }
  });
  if (!existing) throw new Error("not_found");

  const checkIn = input.checkIn ?? existing.checkIn;
  const checkOut = input.checkOut ?? existing.checkOut;
  if (checkOut.getTime() <= checkIn.getTime()) throw new Error("invalid_dates");

  const physicalId = existing.assignedRoomId ?? existing.roomId;
  // Pre-check only (dates unchanged from what was already an occupying booking, or the branch
  // handles the actual re-check+write atomically below when dates DO change) - kept as an early,
  // cheap rejection for the common "no date change" case; the atomic guard below is what actually
  // prevents the race when dates are changing.
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

  // Same SELECT-then-write gap as create above, relevant whenever this update moves offlineStatus
  // into an occupying value or changes dates on an already-occupying booking. Physical room:
  // withRoomOverlapGuard. RoomType-only (no physical room resolved): withRoomTypeCapacityGuard,
  // re-checking capacity inside the same locked transaction as the write.
  try {
    if (physicalId) {
      return await withRoomOverlapGuard(() => prisma.booking.update({ where: { id: existing.id }, data: updateData }));
    }
    if (existing.roomTypeId) {
      const roomTypeId = existing.roomTypeId;
      return await withRoomTypeCapacityGuard(roomTypeId, async (tx) => {
        // Always re-verify inside the lock, not only when dates changed - offlineStatus alone can
        // transition into an occupying value with no date change, and that transition is itself
        // the occupying moment. The lock+recheck is cheap; correctness over micro-optimization.
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
