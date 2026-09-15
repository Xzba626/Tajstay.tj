import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getBookingForOwner } from "@/lib/auth/ownerBooking";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemEvent } from "@/lib/chat/systemEvents";

function isSameLocalDayOrLater(now: Date, checkIn: Date): boolean {
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkInDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  return nowDay.getTime() >= checkInDay.getTime();
}

/**
 * BLOCK 5.4B — the ONE owner action for a pay-at-check-in booking's arrival: "payment received
 * and guest checked in" as a single atomic step, deliberately NOT the existing check-in route
 * (which never touches `paymentStatus` - safe for Pay Now, where paymentStatus is already PAID by
 * the time a booking reaches CONFIRMED, but wrong here). No Payment row is created or expected -
 * `payOnArrival` bookings never have one (see BLOCK 5.4A §7/§21 - the existing owner-manual/
 * offline flow already works this way).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  // Cross-hotel owner denied: getBookingForOwner scopes to (bookingId, ownerId) via the
  // authoritative Room/RoomType->Hotel relation, same pattern as the existing check-in route.
  const booking = await getBookingForOwner(id, owner.id);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!booking.payOnArrival) {
    return NextResponse.json({ error: "not_pay_at_checkin" }, { status: 400 });
  }
  if (booking.status !== BOOKING_STATUS.CONFIRMED || booking.paymentStatus !== "PENDING") {
    // Covers: already CHECKED_IN (double-click/duplicate request - controlled no-op response,
    // not an error the owner needs to act on), cancelled/terminal, or a state that never should
    // have reached this route at all.
    if (booking.status === BOOKING_STATUS.CHECKED_IN && booking.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, alreadyDone: true }, { status: 200 });
    }
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  const now = new Date();
  if (!isSameLocalDayOrLater(now, booking.checkIn)) {
    return NextResponse.json({ error: "too_early" }, { status: 400 });
  }

  // Atomic, and guarded by a WHERE clause on the exact preconditions just checked - a genuinely
  // simultaneous duplicate click resolves to `count: 0` here (someone else's request already won
  // the race) rather than a second real transition or a duplicate TransactionLog/chat message.
  const result = await prisma.booking.updateMany({
    where: { id, status: BOOKING_STATUS.CONFIRMED, paymentStatus: "PENDING", payOnArrival: true },
    data: { status: BOOKING_STATUS.CHECKED_IN, paymentStatus: "PAID" }
  });

  if (result.count === 0) {
    // Lost a genuine race against another request for the same booking (double-click, retried
    // network request) - the other request already made this exact transition; respond as an
    // idempotent success rather than a confusing error.
    const current = await prisma.booking.findUnique({ where: { id }, select: { status: true, paymentStatus: true } });
    if (current?.status === BOOKING_STATUS.CHECKED_IN && current.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, alreadyDone: true }, { status: 200 });
    }
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  await prisma.transactionLog.create({
    data: {
      bookingId: id,
      type: "ARRIVAL_PAYMENT_CONFIRMED",
      payload: JSON.stringify({ byOwnerId: owner.id, amount: Number(booking.totalPrice), currency: booking.currency })
    }
  });

  await addBookingSystemEvent({
    bookingId: id,
    eventType: "arrival_payment.confirmed",
    payload: {}
  });

  if (booking.userId != null) {
    await prisma.notification.create({
      data: { userId: booking.userId, bookingId: id, type: "BOOKING_CHECKED_IN", isRead: false }
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
