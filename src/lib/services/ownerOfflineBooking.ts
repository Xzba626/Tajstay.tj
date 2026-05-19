import { prisma } from "@/lib/prisma";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { BOOKING_SOURCE, BOOKING_STATUS, OFFLINE_STATUS, type OfflineStatus } from "@/lib/domain/booking";
import { createNotification } from "@/lib/notifications/create";
import { generateBookingCode } from "@/lib/services/bookingCode";
import { normalizePhone } from "@/lib/validation/phone";

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
  roomId: number;
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

  const room = await assertRoomOwnedByOwner(input.roomId, input.ownerId);
  if (!room) throw new Error("forbidden");
  if (room.hotel.status !== "APPROVED") throw new Error("hotel_not_available");

  try {
    await assertDatesAvailable({
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut
    });
  } catch (e) {
    if (e instanceof DatesUnavailableError) throw new Error("dates_unavailable");
    throw e;
  }

  const prepayment = input.prepayment != null ? Math.max(0, Number(input.prepayment)) : 0;
  const totalPrice = Math.max(0, Number(input.totalPrice));
  const remainingAmount = Math.max(0, totalPrice - prepayment);
  const offlineStatus = input.offlineStatus ?? OFFLINE_STATUS.CONFIRMED;
  if (!OFFLINE_STATUSES.has(offlineStatus)) throw new Error("invalid_status");

  const publicCode = await generateBookingCode();
  const guestCount = Math.max(1, input.guestCount ?? 1);

  const booking = await prisma.booking.create({
    data: {
      source: BOOKING_SOURCE.OWNER_MANUAL,
      createdByOwnerId: input.ownerId,
      userId: null,
      roomId: input.roomId,
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
      offlinePaymentType: input.offlinePaymentType?.trim() || null,
      totalPrice,
      commission: 0,
      subtotal: totalPrice,
      serviceFee: 0,
      taxAmount: 0,
      publicCode,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: prepayment >= totalPrice && totalPrice > 0 ? "PAID" : "PENDING",
      payOnArrival: true,
      paymentMethod: "ARRIVAL"
    }
  });

  await createNotification({
    userId: input.ownerId,
    type: "OWNER_OFFLINE_BOOKING_CREATED",
    bookingId: booking.id,
    link: `/dashboard/owner?section=offline-bookings`,
    meta: { roomId: input.roomId, publicCode }
  });

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

  if (input.checkIn || input.checkOut) {
    try {
      await assertDatesAvailable({
        roomId: existing.roomId,
        checkIn,
        checkOut,
        excludeBookingId: existing.id
      });
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

  return prisma.booking.update({
    where: { id: existing.id },
    data: {
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
    }
  });
}
