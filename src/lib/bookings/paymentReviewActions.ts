import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemEvent } from "@/lib/chat/systemEvents";
import { assertDatesAvailable, DatesUnavailableError, withRoomOverlapGuard } from "@/lib/booking/availability";
import { assertRoomTypeAvailable, RoomTypeUnavailableError, withRoomTypeCapacityGuard } from "@/lib/pms/inventory";
import { bookingHotel } from "@/lib/pms/bookingContext";

type ActorRole = "OWNER" | "ADMIN";

type ReviewActorParams = {
  bookingId: number;
  actorId: number;
  actorRole: ActorRole;
  /** Required for ADMIN (override justification); optional note for OWNER's normal reject. */
  reason?: string;
};

const bookingWithHotel = {
  room: { include: { hotel: true } },
  roomType: { include: { hotel: true } },
  assignedRoom: { include: { hotel: true } }
} as const;

/**
 * Loads the booking and verifies the acting role is allowed to review its payment.
 * OWNER must own the hotel behind this booking (normal path, no reason required).
 * ADMIN is a scoped override for disputes/support - always requires a non-empty reason, and may
 * act even on a booking the owner already reviewed (see rejectBookingPayment/confirmBookingPayment).
 */
async function loadAuthorizedBooking(bookingId: number, actorId: number, actorRole: ActorRole) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotel
  });
  if (!booking) throw new Error("NOT_FOUND");
  const hotel = bookingHotel(booking);

  if (actorRole === "OWNER" && hotel.ownerId !== actorId) {
    throw new Error("FORBIDDEN");
  }

  return { booking, hotel };
}

export async function confirmBookingPayment({ bookingId, actorId, actorRole, reason }: ReviewActorParams): Promise<void> {
  if (actorRole === "ADMIN" && !reason?.trim()) throw new Error("REASON_REQUIRED");

  const { booking, hotel } = await loadAuthorizedBooking(bookingId, actorId, actorRole);

  // Owner path: normal single review. Admin override: may act even after the booking already left
  // ON_REVIEW (owner already confirmed/rejected) - a dispute is, by definition, revisiting a
  // decision that was already made. BUT this "may act on a non-ON_REVIEW booking" allowance was
  // previously unbounded - it let a reason string alone move a booking out of a genuine TERMINAL
  // state (CANCELLED/EXPIRED/COMPLETED/REJECTED) straight to CONFIRMED, which is a distinct,
  // deliberate business decision (e.g. "un-cancel and honor a booking"), not a side effect of the
  // ordinary payment-dispute-override flow. That still needs its own explicitly-designed action if
  // ever required - it is out of scope here and is now blocked outright, for every actor role.
  if (actorRole === "OWNER" && booking.status !== BOOKING_STATUS.ON_REVIEW) {
    throw new Error("NOT_ON_REVIEW");
  }
  const TERMINAL_STATUSES_BLOCKING_CONFIRM: string[] = [
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.REJECTED
  ];
  if (TERMINAL_STATUSES_BLOCKING_CONFIRM.includes(booking.status)) {
    throw new Error("TERMINAL_STATUS_CANNOT_CONFIRM");
  }
  if (!booking.paymentProofUrl || !booking.proofSubmittedAt) throw new Error("NO_PROOF");

  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment) throw new Error("BAD_PAYMENT");
  if (actorRole === "OWNER" && payment.status !== "PENDING") throw new Error("BAD_PAYMENT");

  const physicalRoomId = booking.assignedRoomId ?? booking.roomId;
  const previousStatus = booking.status;
  const confirmData = {
    status: BOOKING_STATUS.CONFIRMED,
    paymentStatus: "PAID",
    proofReviewedAt: new Date(),
    proofReviewedById: actorId,
    paymentReviewNote: reason?.trim() || undefined
  } as const;

  // Both branches below fold the availability re-check and the write into ONE atomic operation -
  // a plain SELECT-then-write gap here is exactly the race Block 2/2.1 closed. Physical room:
  // withRoomOverlapGuard (DB EXCLUDE constraint on the room+date range is the real backstop).
  // RoomType-only (no physical room resolved yet): withRoomTypeCapacityGuard (Postgres advisory
  // lock scoped to this roomTypeId, re-checking capacity inside the same locked transaction) -
  // the EXCLUDE constraint can't cover this case, it has no single column to range-exclude on.
  try {
    if (physicalRoomId) {
      await assertDatesAvailable({
        roomId: physicalRoomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: bookingId
      });
      await withRoomOverlapGuard(() => prisma.booking.update({ where: { id: bookingId }, data: confirmData }));
    } else if (booking.roomTypeId) {
      const roomTypeId = booking.roomTypeId;
      await withRoomTypeCapacityGuard(roomTypeId, async (tx) => {
        await assertRoomTypeAvailable({
          roomTypeId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          excludeBookingId: bookingId,
          client: tx
        });
        await tx.booking.update({ where: { id: bookingId }, data: confirmData });
      });
    } else {
      await prisma.booking.update({ where: { id: bookingId }, data: confirmData });
    }
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) {
      throw new Error("DATES_UNAVAILABLE");
    }
    throw e;
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED" } });

  const { markBookingRevenueRecognized } = await import("@/lib/owner/analytics/getHotelAnalytics");
  await markBookingRevenueRecognized(bookingId);

  await prisma.transactionLog.create({
    data: {
      bookingId,
      paymentId: payment.id,
      type: actorRole === "ADMIN" ? "ADMIN_PAYMENT_OVERRIDE" : "OWNER_PAYMENT_CONFIRMED",
      payload: JSON.stringify({
        actorId,
        actorRole,
        reason: reason?.trim() || undefined,
        previousStatus,
        newStatus: BOOKING_STATUS.CONFIRMED,
        at: new Date().toISOString()
      })
    }
  });

  await addBookingSystemEvent({
    bookingId,
    eventType: "payment.confirmed",
    payload: { byRole: actorRole }
  });

  if (booking.userId != null) {
    await prisma.notification.create({
      data: { userId: booking.userId, bookingId, type: "PAYMENT_APPROVED", isRead: false }
    });
  }
  await prisma.notification.create({
    data: { userId: hotel.ownerId, bookingId, type: "PAYMENT_APPROVED", isRead: false }
  });

  // Outbound receipt (Email/Telegram) — after commit; never rolls back confirmation.
  const { queueBookingConfirmationDelivery } = await import("@/lib/bookings/bookingConfirmationDelivery");
  queueBookingConfirmationDelivery(bookingId, "booking.confirmed.payment_captured");
}

export async function rejectBookingPayment({ bookingId, actorId, actorRole, reason }: ReviewActorParams): Promise<void> {
  // A rejection reason is the guest's only signal for what to fix before resubmitting proof - an
  // empty one (previously silently replaced with the hardcoded "Причина не указана") left the
  // guest with no actionable information. Required for BOTH roles now, not just ADMIN's override
  // path - the route layer (payment-reject/route.ts) also validates this before calling in, but
  // the check belongs here too since this is the actual state-mutating boundary.
  const trimmedReason = reason?.trim() ?? "";
  if (trimmedReason.length < 3) throw new Error("REASON_REQUIRED");

  const { booking, hotel } = await loadAuthorizedBooking(bookingId, actorId, actorRole);

  if (actorRole === "OWNER" && booking.status !== BOOKING_STATUS.ON_REVIEW) {
    throw new Error("NOT_ON_REVIEW");
  }
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  const previousStatus = booking.status;

  // Rejecting a payment PROOF is not the same as rejecting the whole booking - a blurry photo or
  // wrong amount is a reason to ask for a new receipt, not to kill the reservation. Send the
  // booking back to WAITING_PAYMENT with a fresh payment window instead of a terminal REJECTED
  // status, so the guest can simply submit a corrected proof through the normal flow. A genuine
  // booking cancellation is a separate, distinct action - not a side effect of a bad receipt.
  const retryWindowMs = 15 * 60 * 1000;
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BOOKING_STATUS.WAITING_PAYMENT,
      paymentProofUrl: null,
      proofSubmittedAt: null,
      proofReviewDeadlineAt: null,
      paymentTimerPaused: false,
      expiresAt: new Date(Date.now() + retryWindowMs),
      proofReviewedAt: new Date(),
      proofReviewedById: actorId,
      paymentReviewNote: trimmedReason
    }
  });

  await prisma.transactionLog.create({
    data: {
      bookingId,
      type: actorRole === "ADMIN" ? "ADMIN_PAYMENT_OVERRIDE" : "OWNER_PAYMENT_PROOF_REJECTED",
      payload: JSON.stringify({
        actorId,
        actorRole,
        reason: trimmedReason,
        previousStatus,
        newStatus: BOOKING_STATUS.WAITING_PAYMENT,
        at: new Date().toISOString()
      })
    }
  });

  await addBookingSystemEvent({
    bookingId,
    eventType: "proof.rejected",
    payload: { reason: trimmedReason }
  });

  if (booking.userId != null) {
    await prisma.notification.create({
      data: { userId: booking.userId, bookingId, type: "PAYMENT_REJECTED", isRead: false }
    });
  }
  await prisma.notification.create({
    data: { userId: hotel.ownerId, bookingId, type: "PAYMENT_REJECTED", isRead: false }
  });
}
