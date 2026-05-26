import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

function canCancel(status: string): boolean {
  return (
    status === BOOKING_STATUS.WAIT_PROOF ||
    status === BOOKING_STATUS.ON_REVIEW ||
    status === BOOKING_STATUS.REJECTED
  );
}

export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const code = String(form.get("code") ?? "").trim();
  if (!code) return NextResponse.redirect(publicUrl(req, "/dashboard/guest"));

  const booking = await prisma.booking.findUnique({
    where: { publicCode: code },
    include: bookingWithHotelInclude
  });
  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canCancel(booking.status)) {
    return NextResponse.redirect(publicUrl(req, `/payment/${encodeURIComponent(code)}`));
  }

  const hotel = bookingHotel(booking);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BOOKING_STATUS.CANCELLED,
      paymentStatus: booking.paymentStatus === "PAID" ? "REFUNDED" : booking.paymentStatus
    }
  });

  await prisma.notification.create({
    data: {
      userId: hotel.ownerId,
      bookingId: booking.id,
      type: "BOOKING_CANCELLED_BY_GUEST",
      isRead: false
    }
  });

  return NextResponse.redirect(publicUrl(req, `/payment/${encodeURIComponent(code)}`));
}

