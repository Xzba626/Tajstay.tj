import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { confirmBookingPayment, rejectBookingPayment } from "@/lib/bookings/paymentReviewActions";

const EXTEND_MS = 5 * 60 * 1000;

export async function extendBookingPaymentWindowAdmin(bookingId: number): Promise<{ expiresAt: Date; paymentTimerPaused: boolean }> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("NOT_FOUND");
  if (booking.status !== BOOKING_STATUS.WAITING_PAYMENT && booking.status !== BOOKING_STATUS.WAIT_PROOF) {
    throw new Error("INVALID_STATUS");
  }
  const base = Math.max(Date.now(), booking.expiresAt?.getTime() ?? 0);
  const next = new Date(base + EXTEND_MS);
  await prisma.booking.update({
    where: { id: bookingId },
    data: { expiresAt: next, paymentTimerPaused: false }
  });
  return { expiresAt: next, paymentTimerPaused: false };
}

/**
 * Admin override on a payment proof. Admin is no longer the normal reviewer (that's the owner's
 * job now, see paymentReviewActions.ts) - this is a scoped, audited override for disputes/support,
 * so a reason is mandatory and always logged (see paymentReviewActions.ts's ADMIN_PAYMENT_OVERRIDE
 * TransactionLog entry).
 */
export async function confirmBookingPaymentAdmin(bookingId: number, adminId: number, reason: string): Promise<void> {
  await confirmBookingPayment({ bookingId, actorId: adminId, actorRole: "ADMIN", reason });
}

export async function rejectBookingPaymentAdmin(bookingId: number, adminId: number, reason: string): Promise<void> {
  await rejectBookingPayment({ bookingId, actorId: adminId, actorRole: "ADMIN", reason });
}
