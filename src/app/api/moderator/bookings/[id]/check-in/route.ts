import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardResponse, requireBookingApiPermission, PERMISSION } from "@/lib/auth/apiGuard";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await requireBookingApiPermission(id, PERMISSION.CHECK_IN_OUT);
  if (isGuardResponse(user)) return user;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    return NextResponse.json({ error: "Заселение доступно только для подтверждённой брони" }, { status: 400 });
  }

  const now = new Date();
  if (!isSameLocalDay(now, booking.checkIn)) {
    return NextResponse.json({ error: "Подтверждение заселения доступно только в день заезда" }, { status: 400 });
  }

  await prisma.booking.update({ where: { id }, data: { status: BOOKING_STATUS.CHECKED_IN } });

  await addBookingSystemMessage({
    bookingId: id,
    message: "🛡️ Система: Модератор отеля подтвердил заселение."
  });

  if (booking.userId != null) {
    await prisma.notification.create({
      data: { userId: booking.userId, bookingId: id, type: "BOOKING_CHECKED_IN", isRead: false }
    });
  }

  return NextResponse.json({ ok: true });
}
