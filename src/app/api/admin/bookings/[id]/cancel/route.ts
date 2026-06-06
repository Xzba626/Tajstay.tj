import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";
import { dispatchBookingCancelledEmails } from "@/lib/email/bookingEmailDispatch";

const BLOCKED = new Set([
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  "CANCELLED_BY_GUEST",
  BOOKING_STATUS.EXPIRED,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN
]);

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireUser(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (BLOCKED.has(booking.status)) {
    return NextResponse.json({ error: "Бронь уже закрыта" }, { status: 400 });
  }

  await prisma.booking.update({
    where: { id },
    data: {
      status: BOOKING_STATUS.CANCELLED,
      paymentStatus: booking.paymentStatus === "PAID" ? booking.paymentStatus : "FAILED"
    }
  });

  if (booking.payment && booking.payment.status === "PENDING") {
    await prisma.payment.update({ where: { id: booking.payment.id }, data: { status: "FAILED" } });
  }

  await addBookingSystemMessage({
    bookingId: id,
    message: "🛡️ Система: Бронирование отменено администратором."
  }).catch(() => undefined);

  if (booking.userId != null) {
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        bookingId: id,
        type: "BOOKING_REJECTED",
        isRead: false
      }
    });
  }

  void dispatchBookingCancelledEmails(id, "admin").catch((e) => {
    console.error("[admin/cancel] cancelled emails failed", id, e);
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
