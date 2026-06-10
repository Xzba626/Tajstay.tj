import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { assertRoomTypeAvailable, RoomTypeUnavailableError } from "@/lib/pms/inventory";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";
import { createNotification } from "@/lib/notifications/create";
import { sendBookingConfirmedEmail } from "@/lib/email/sendBookingConfirmedEmail";

const ALLOWED_STATUSES = [
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW
] as const;

export async function confirmBookingPaymentOwner(bookingId: number, ownerId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      ...bookingWithHotelInclude
    }
  });

  if (!booking) throw new Error("NOT_FOUND");

  const hotel = bookingHotel(booking);
  if (hotel.ownerId !== ownerId) throw new Error("FORBIDDEN");

  if (!(ALLOWED_STATUSES as readonly string[]).includes(booking.status)) {
    throw new Error("INVALID_STATUS");
  }

  const physicalRoomId = booking.assignedRoomId ?? booking.roomId;
  try {
    if (physicalRoomId) {
      await assertDatesAvailable({
        roomId: physicalRoomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: bookingId
      });
    } else if (booking.roomTypeId) {
      await assertRoomTypeAvailable({
        roomTypeId: booking.roomTypeId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: bookingId
      });
    }
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) {
      throw new Error("DATES_UNAVAILABLE");
    }
    throw e;
  }

  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (payment && payment.status === "PENDING") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED" } });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: "PAID",
      paymentApprovedAt: new Date(),
      paymentApprovedBy: ownerId,
      proofReviewedAt: booking.proofReviewedAt ?? new Date(),
      proofReviewedById: booking.proofReviewedById ?? ownerId
    }
  });

  await prisma.transactionLog.create({
    data: {
      bookingId,
      paymentId: payment?.id,
      type: "PAYMENT_CONFIRMED_BY_OWNER",
      payload: JSON.stringify({ ownerId, at: new Date().toISOString() })
    }
  });

  await addBookingSystemMessage({
    bookingId,
    message: "🛡️ Система: Хозяин подтвердил оплату. Бронирование подтверждено!"
  }).catch(() => undefined);

  if (booking.userId != null) {
    await createNotification({
      userId: booking.userId,
      type: "BOOKING_PAYMENT_CONFIRMED",
      bookingId,
      message: "Хозяин подтвердил получение оплаты. Приятного пребывания!",
      link: `/chat/booking/${bookingId}`
    });
  }

  if (booking.user) {
    await sendBookingConfirmedEmail({
      guestEmail: booking.user.email,
      guestName: booking.user.name ?? "Гость",
      hotelName: hotel.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      publicCode: booking.publicCode
    });
  }

  return updated;
}
