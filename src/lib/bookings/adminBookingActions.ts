import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";

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

export async function confirmBookingPaymentAdmin(bookingId: number, adminId: number): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { include: { hotel: true } } }
  });
  if (!booking) throw new Error("NOT_FOUND");
  if (booking.status !== BOOKING_STATUS.ON_REVIEW) throw new Error("NOT_ON_REVIEW");
  if (!booking.paymentProofUrl || !booking.proofSubmittedAt) throw new Error("NO_PROOF");

  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment || payment.status !== "PENDING") throw new Error("BAD_PAYMENT");

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: "PAID",
      proofReviewedAt: new Date(),
      proofReviewedById: adminId
    }
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED" } });

  await addBookingSystemMessage({
    bookingId,
    message: "🛡️ Система: Бронирование подтверждено! Ждем вас."
  });

  await prisma.notification.create({
    data: { userId: booking.userId, bookingId, type: "PAYMENT_APPROVED", isRead: false }
  });
  await prisma.notification.create({
    data: { userId: booking.room.hotel.ownerId, bookingId, type: "PAYMENT_APPROVED", isRead: false }
  });
}
