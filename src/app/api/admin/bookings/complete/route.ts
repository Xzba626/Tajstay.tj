import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { appBaseUrl } from "@/lib/email/bookingEmails";
import { sendOwnerPayoutEmail } from "@/lib/email/sendOwnerPayoutEmail";
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

  const owner = await prisma.user.findUnique({
    where: { id: hotel.ownerId },
    select: { email: true, name: true }
  });
  const ownerEmail = owner?.email?.trim();
  if (ownerEmail && booking.publicCode) {
    await sendOwnerPayoutEmail({
      ownerEmail,
      ownerName: owner?.name,
      hotelName: hotel.name,
      bookingCode: booking.publicCode,
      amount: payoutAmount,
      currency: booking.currency,
      dashboardUrl: `${appBaseUrl()}/dashboard/owner?section=finances`
    });
  }

  return NextResponse.redirect(publicUrl(req, `/chat/booking/${id}`));
}
