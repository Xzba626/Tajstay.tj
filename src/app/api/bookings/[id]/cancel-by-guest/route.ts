import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { guestBookingCancelAllowed } from "@/lib/booking/guestCancel";
import { dispatchBookingCancelledEmails } from "@/lib/email/bookingEmailDispatch";

type CancelResult = { ok: true } | { ok: false; error: string };

async function pickAdminId(): Promise<number | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true }
  });
  return admin?.id ?? null;
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<CancelResult>> {
  const guest = await requireUser(["GUEST"]);
  if (!guest) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { ...bookingWithHotelInclude, payment: true }
  });
  if (!booking || booking.userId !== guest.id) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (!guestBookingCancelAllowed({ status: booking.status, paymentStatus: booking.paymentStatus })) {
    return NextResponse.json({ ok: false, error: "Нельзя отменить после подтверждения оплаты" }, { status: 409 });
  }

  const ownerId = bookingHotel(booking).ownerId;
  const adminId = await pickAdminId();

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: { status: "CANCELLED_BY_GUEST", paymentStatus: booking.paymentStatus === "PAID" ? "REFUNDED" : booking.paymentStatus }
    });

    // Remove/hide distracting notifications for owner/admin about this booking.
    const cleanupUserIds = [ownerId, adminId].filter((v): v is number => typeof v === "number");
    if (cleanupUserIds.length) {
      await tx.notification.deleteMany({ where: { bookingId: id, userId: { in: cleanupUserIds } } });
    }

    await tx.transactionLog.create({
      data: { bookingId: id, type: "BOOKING_CANCELLED_BY_GUEST", payload: JSON.stringify({ at: new Date().toISOString() }) }
    });
  });

  await addBookingSystemMessage({
    bookingId: id,
    message: "🛡️ Система: Бронирование отменено пользователем. Сессия закрыта."
  }).catch(() => undefined);

  void dispatchBookingCancelledEmails(id, "guest").catch((e) => {
    console.error("[bookings/cancel-by-guest] cancelled emails failed", id, e);
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

