import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { getBookingForOwner } from "@/lib/auth/ownerBooking";
import { BOOKING_STATUS } from "@/lib/domain/booking";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await getBookingForOwner(id, owner.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== BOOKING_STATUS.PENDING_OWNER) {
    return NextResponse.json({ error: "Бронь не ожидает подтверждения" }, { status: 400 });
  }
  // For online transfer flow, rejection happens via payment review (ON_REVIEW -> payment-reject).
  // This endpoint is reserved for "pay on arrival" bookings.
  if (!booking.payOnArrival) {
    return NextResponse.json({ error: "Нельзя отклонить бронь без оплаты/чека" }, { status: 400 });
  }

  await prisma.booking.update({
    where: { id },
    data: {
      status: BOOKING_STATUS.REJECTED,
      paymentStatus: booking.paymentStatus === "PAID" ? "REFUNDED" : booking.paymentStatus
    }
  });

  await prisma.notification.create({
    data: {
      userId: booking.userId,
      bookingId: id,
      type: "BOOKING_REJECTED",
      isRead: false
    }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=bookings"));
}
