import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS, isOfflineBookingSource, OFFLINE_STATUS } from "@/lib/domain/booking";
import { hotelBookingWhere } from "@/lib/pms/ownerQueries";
import { normalizeSettlementChannel, SETTLEMENT_CHANNEL } from "@/lib/owner/analytics/settlement";
import { markBookingRevenueRecognized } from "@/lib/owner/analytics/getHotelAnalytics";
import { writeOwnerHotelAudit } from "@/lib/owner/analytics/audit";
import { addBookingSystemEvent } from "@/lib/chat/systemEvents";

function isSameLocalDayOrLater(now: Date, checkIn: Date): boolean {
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkInDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  return nowDay.getTime() >= checkInDay.getTime();
}

/**
 * Record Cash/Card payment for a hotel-scoped booking (Manager or Owner actor).
 * Idempotent: already PAID → alreadyDone.
 * Pay-at-check-in: CONFIRMED+PENDING → CHECKED_IN+PAID (preserves BLOCK 5.4 semantics).
 */
export async function recordHotelBookingPayment(input: {
  hotelId: number;
  bookingId: number;
  actorUserId: number;
  actorRole: "OWNER" | "MANAGER";
  settlement: "CASH" | "CARD";
}) {
  const settlement = normalizeSettlementChannel(input.settlement);
  if (settlement !== SETTLEMENT_CHANNEL.CASH && settlement !== SETTLEMENT_CHANNEL.CARD) {
    throw new Error("invalid_settlement");
  }

  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, ...hotelBookingWhere(input.hotelId) }
  });
  if (!booking) throw new Error("not_found");

  if (booking.paymentStatus === "PAID") {
    return { ok: true as const, alreadyDone: true };
  }

  // Pay-at-check-in online path
  if (
    booking.payOnArrival &&
    booking.status === BOOKING_STATUS.CONFIRMED &&
    booking.paymentStatus === "PENDING" &&
    !isOfflineBookingSource(booking.source)
  ) {
    if (!isSameLocalDayOrLater(new Date(), booking.checkIn)) throw new Error("too_early");

    const result = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: "PENDING",
        payOnArrival: true
      },
      data: {
        status: BOOKING_STATUS.CHECKED_IN,
        paymentStatus: "PAID",
        settlementChannel: settlement,
        offlinePaymentType: settlement
      }
    });
    if (result.count === 0) {
      const current = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { status: true, paymentStatus: true }
      });
      if (current?.status === BOOKING_STATUS.CHECKED_IN && current.paymentStatus === "PAID") {
        return { ok: true as const, alreadyDone: true };
      }
      throw new Error("invalid_state");
    }

    await prisma.transactionLog.create({
      data: {
        bookingId: booking.id,
        type: "ARRIVAL_PAYMENT_CONFIRMED",
        payload: JSON.stringify({
          byUserId: input.actorUserId,
          actorRole: input.actorRole,
          amount: Number(booking.totalPrice),
          currency: booking.currency,
          settlement
        })
      }
    });
    await markBookingRevenueRecognized(booking.id, { settlementChannel: settlement });
    await addBookingSystemEvent({
      bookingId: booking.id,
      eventType: "arrival_payment.confirmed",
      payload: {}
    });
    await writeOwnerHotelAudit({
      hotelId: input.hotelId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: "payment.recorded",
      entityType: "Booking",
      entityId: booking.id,
      afterState: {
        publicCode: booking.publicCode,
        settlement,
        amount: Number(booking.totalPrice),
        transition: "CHECKED_IN+PAID"
      }
    });
    if (booking.userId != null) {
      await prisma.notification.create({
        data: { userId: booking.userId, bookingId: booking.id, type: "BOOKING_CHECKED_IN", isRead: false }
      });
    }
    return { ok: true as const, alreadyDone: false };
  }

  // Offline / general PENDING → PAID
  if (booking.paymentStatus !== "PENDING") throw new Error("invalid_state");

  const offlinePatch =
    isOfflineBookingSource(booking.source) && booking.offlineStatus === OFFLINE_STATUS.CONFIRMED
      ? { offlineStatus: OFFLINE_STATUS.CHECKED_IN }
      : {};

  const result = await prisma.booking.updateMany({
    where: { id: booking.id, paymentStatus: "PENDING" },
    data: {
      paymentStatus: "PAID",
      settlementChannel: settlement,
      offlinePaymentType: settlement,
      remainingAmount: 0,
      prepayment: booking.totalPrice,
      ...offlinePatch
    }
  });
  if (result.count === 0) {
    const current = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { paymentStatus: true }
    });
    if (current?.paymentStatus === "PAID") return { ok: true as const, alreadyDone: true };
    throw new Error("invalid_state");
  }

  await markBookingRevenueRecognized(booking.id, { settlementChannel: settlement });
  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: "payment.recorded",
    entityType: "Booking",
    entityId: booking.id,
    afterState: {
      publicCode: booking.publicCode,
      settlement,
      amount: Number(booking.totalPrice)
    }
  });

  return { ok: true as const, alreadyDone: false };
}
