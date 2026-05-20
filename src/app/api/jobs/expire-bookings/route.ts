import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = (process.env.JOB_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ error: "JOB_SECRET not set" }, { status: 503 });
  const provided = req.headers.get("x-job-secret")?.trim() ?? req.nextUrl.searchParams.get("secret")?.trim() ?? "";
  if (provided !== secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const expired = await prisma.booking.findMany({
    where: {
      status: { in: [BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.WAIT_PROOF] },
      expiresAt: { lt: now },
      paymentTimerPaused: false
    },
    select: { id: true, userId: true, room: { select: { hotel: { select: { ownerId: true } } } }, payment: { select: { id: true } } }
  });

  const reviewTimedOut = await prisma.booking.findMany({
    where: {
      status: BOOKING_STATUS.ON_REVIEW,
      proofReviewedAt: null,
      proofReviewDeadlineAt: { lt: now }
    },
    select: { id: true, userId: true, payment: { select: { id: true } } }
  });

  if (!expired.length && !reviewTimedOut.length) return NextResponse.json({ ok: true, expired: 0, reviewTimedOut: 0 });

  const ids = expired.map((b) => b.id);
  if (ids.length) {
    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: BOOKING_STATUS.EXPIRED, paymentStatus: "FAILED" }
    });
    // Notify owner that booking expired and is removed from active flow
    await prisma.notification.createMany({
      data: expired.map((b) => ({
        userId: b.room.hotel.ownerId,
        bookingId: b.id,
        type: "BOOKING_EXPIRED",
        isRead: false
      }))
    });
    // Add system message in chat
    await Promise.all(
      expired.map((b) =>
        addBookingSystemMessage({
          bookingId: b.id,
          message: "🛡️ Система: Бронь отменена по истечении 15 минут. Чат закрыт."
        }).catch(() => undefined)
      )
    );
  }

  const reviewIds = reviewTimedOut.map((b) => b.id);
  if (reviewIds.length) {
    await prisma.booking.updateMany({
      where: { id: { in: reviewIds } },
      data: { status: BOOKING_STATUS.REJECTED, paymentStatus: "FAILED", proofReviewedAt: now }
    });
    const guestNotifications = reviewTimedOut
      .filter((b): b is typeof b & { userId: number } => b.userId != null)
      .map((b) => ({
        userId: b.userId,
        bookingId: b.id,
        type: "PAYMENT_REJECTED",
        isRead: false
      }));
    if (guestNotifications.length) {
      await prisma.notification.createMany({ data: guestNotifications });
    }
  }

  const paymentIds = [...expired.map((b) => b.payment?.id), ...reviewTimedOut.map((b) => b.payment?.id)]
    .filter(Boolean) as number[];
  if (paymentIds.length) {
    await prisma.payment.updateMany({ where: { id: { in: paymentIds } }, data: { status: "FAILED" } });
  }

  if (ids.length) {
    await prisma.transactionLog.createMany({
      data: ids.map((id) => ({
        bookingId: id,
        type: "BOOKING_EXPIRED",
        payload: JSON.stringify({ at: now.toISOString() })
      }))
    });
  }

  if (reviewIds.length) {
    await prisma.transactionLog.createMany({
      data: reviewIds.map((id) => ({
        bookingId: id,
        type: "PAYMENT_REVIEW_TIMED_OUT",
        payload: JSON.stringify({ at: now.toISOString() })
      }))
    });
    await Promise.all(
      reviewIds.map((id) =>
        addBookingSystemMessage({
          bookingId: id,
          message: "🛡️ Система: Время проверки чека истекло. Оплата отклонена."
        }).catch(() => undefined)
      )
    );
  }

  return NextResponse.json({ ok: true, expired: ids.length, reviewTimedOut: reviewIds.length });
}

