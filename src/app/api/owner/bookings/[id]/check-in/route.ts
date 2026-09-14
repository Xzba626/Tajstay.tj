import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getBookingForOwner } from "@/lib/auth/ownerBooking";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await getBookingForOwner(id, owner.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    return NextResponse.json({ error: "Заселение доступно только для подтверждённой брони" }, { status: 400 });
  }

  // BLOCK 5.4B: this route only ever set `status`, never `paymentStatus` - safe for Pay Now
  // (paymentStatus is already PAID by the time a booking reaches CONFIRMED there). A pay-at-
  // check-in booking reaches CONFIRMED with paymentStatus still PENDING, so letting it through
  // here would silently produce CHECKED_IN + still-unpaid with no record money ever changed
  // hands. That booking must go through the dedicated arrival-payment action instead, which sets
  // both fields together in one atomic transition.
  if (booking.payOnArrival) {
    return NextResponse.json({ error: "Для брони с оплатой при заселении используйте подтверждение оплаты" }, { status: 400 });
  }

  const now = new Date();
  if (!isSameLocalDay(now, booking.checkIn)) {
    return NextResponse.json({ error: "Подтверждение заселения доступно только в день заезда" }, { status: 400 });
  }

  await prisma.booking.update({ where: { id }, data: { status: BOOKING_STATUS.CHECKED_IN } });

  await addBookingSystemMessage({
    bookingId: id,
    message: "🛡️ Система: Владелец подтвердил заселение. Средства заморожены до завершения."
  });

  if (booking.userId != null) {
    await prisma.notification.create({
      data: { userId: booking.userId, bookingId: id, type: "BOOKING_CHECKED_IN", isRead: false }
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

