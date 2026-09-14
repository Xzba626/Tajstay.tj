import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { publicUrl } from "@/lib/http/publicOrigin";

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
    if (booking.paymentStatus !== "PAID" || booking.status !== BOOKING_STATUS.CHECKED_IN) {
      return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=complete_requires_paid"));
    }
    await prisma.booking.update({ where: { id }, data: { status: BOOKING_STATUS.COMPLETED } });
    await prisma.transactionLog.create({
      data: {
        bookingId: booking.id,
        type: "PAY_AT_CHECKIN_COMPLETED_NO_PAYOUT",
        payload: JSON.stringify({ byAdminId: admin.id, note: "payment received directly by hotel - no platform-held funds, no payout" })
      }
    });
    return NextResponse.redirect(publicUrl(req, `/chat/booking/${id}`));
  }

  if (booking.paymentStatus !== "PAID" || booking.payment?.status !== "CAPTURED") {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=complete_requires_paid"));
  }

  await prisma.booking.update({
    where: { id },
    data: { status: BOOKING_STATUS.COMPLETED }
  });

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
