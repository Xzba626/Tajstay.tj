import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { publicUrl } from "@/lib/http/publicOrigin";
import { DELIVERY_CHANGE, mutateBookingWithDelivery } from "@/lib/local-vault/bookingDelivery";

/** BLOCK 5.5B P1-4: "checkout has been reached" - the same boundary already used elsewhere in this
 * codebase for the identical concept (the review-eligibility check this project already had used
 * `checkOut.getTime() > Date.now()` to mean "checkout hasn't happened yet"; this is that same
 * comparison, not a new invented hour). `checkOut` is stored as a plain calendar-date `DateTime`
 * (midnight UTC of that date, per booking creation) - there is no separate checkout-hour concept
 * anywhere in the current product model, so none is introduced here. */
function checkoutReached(checkOut: Date, now: Date = new Date()): boolean {
  return checkOut.getTime() <= now.getTime();
}

/** Ручное вмешательство админа: подтвердить бронь (например спор). */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: { include: { hotel: true } },
      payment: true
    }
  });
  if (!booking) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
  }
  const hotel = bookingHotel(booking);

  // BLOCK 5.4B — critical gate, verified against the actual `Payout` semantics before writing
  // this: `Payout`/the "ESCROW_RELEASED_PAYOUT_CREATED" log type unambiguously mean "TajStay held
  // this guest's money (captured via the Pay Now proof flow) and is now releasing the owner's
  // share." A pay-at-check-in booking's money went directly from guest to hotel - TajStay never
  // held it - so it must NEVER create a Payout or claim an escrow release. No synthetic
  // Payment/CAPTURED row is created to force it through the Pay Now branch below.
  if (booking.payOnArrival) {
    // BLOCK 5.5B P1-4: CHECKED_IN alone was already required here, but checkout being reached
    // was not - added for the same reason as the Pay Now branch below (a stay in progress must
    // not be closeable early).
    if (
      booking.paymentStatus !== "PAID" ||
      booking.status !== BOOKING_STATUS.CHECKED_IN ||
      !checkoutReached(booking.checkOut)
    ) {
      return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=complete_requires_paid"));
    }
    // Atomic, WHERE-guarded exactly like confirm-arrival-payment/route.ts - a genuinely
    // simultaneous second completion request resolves to count:0 (someone else already won)
    // rather than a duplicate TransactionLog.
    const result = await mutateBookingWithDelivery(id, DELIVERY_CHANGE.UPDATED, (tx) =>
      tx.booking.updateMany({
        where: { id, status: BOOKING_STATUS.CHECKED_IN, paymentStatus: "PAID", payOnArrival: true },
        data: { status: BOOKING_STATUS.COMPLETED }
      })
    );
    if (result.count === 0) {
      return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=complete_requires_paid"));
    }
    await prisma.transactionLog.create({
      data: {
        bookingId: booking.id,
        type: "PAY_AT_CHECKIN_COMPLETED_NO_PAYOUT",
        payload: JSON.stringify({ byAdminId: admin.id, note: "payment received directly by hotel - no platform-held funds, no payout" })
      }
    });
    return NextResponse.redirect(publicUrl(req, `/chat/booking/${id}`));
  }

  // BLOCK 5.5B P1-4 — the actual financial-integrity fix, proven missing by a real HTTP test
  // (scripts/test-block55a1-completion-safety.ts) that could otherwise complete a booking - and
  // trigger a real Payout - that was never checked in, or checked in but nowhere near its
  // checkout date. All four conditions are now required together: paid, captured, CHECKED_IN
  // (never a direct CONFIRMED -> COMPLETED jump), and checkout actually reached.
  if (
    booking.paymentStatus !== "PAID" ||
    booking.payment?.status !== "CAPTURED" ||
    booking.status !== BOOKING_STATUS.CHECKED_IN ||
    !checkoutReached(booking.checkOut)
  ) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=complete_requires_paid"));
  }

  // Atomic, WHERE-guarded on the exact preconditions just checked - a genuinely simultaneous
  // second completion request for the same booking resolves to count:0 rather than a second
  // Payout/TransactionLog.
  const result = await mutateBookingWithDelivery(id, DELIVERY_CHANGE.UPDATED, (tx) =>
    tx.booking.updateMany({
      where: { id, status: BOOKING_STATUS.CHECKED_IN, paymentStatus: "PAID", payOnArrival: false },
      data: { status: BOOKING_STATUS.COMPLETED }
    })
  );
  if (result.count === 0) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=complete_requires_paid"));
  }

  const payoutAmount =
    booking.subtotal != null && booking.commission != null
      ? Number(booking.subtotal) - Number(booking.commission)
      : Number(booking.totalPrice) - Number(booking.commission);

  await prisma.payout.create({
    data: {
      bookingId: booking.id,
      ownerId: hotel.ownerId,
      currency: booking.currency,
      amount: payoutAmount,
      status: "PENDING"
    }
  });

  await prisma.transactionLog.create({
    data: {
      bookingId: booking.id,
      paymentId: booking.payment?.id ?? null,
      type: "ESCROW_RELEASED_PAYOUT_CREATED",
      payload: JSON.stringify({ byAdminId: admin.id, ownerId: hotel.ownerId, amount: payoutAmount, currency: booking.currency })
    }
  });

  return NextResponse.redirect(publicUrl(req, `/chat/booking/${id}`));
}
