import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { getBookingForOwner } from "@/lib/auth/ownerBooking";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { autoAssignBookingIfPossible } from "@/lib/pms/assignment";
import { assertRoomTypeAvailable, RoomTypeUnavailableError } from "@/lib/pms/inventory";
import { getBookingPhysicalRoomId } from "@/lib/pms/types";
import { dispatchBookingConfirmedEmails } from "@/lib/email/bookingEmailDispatch";

function wantsJson(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") || req.headers.get("x-requested-with") === "fetch";
}

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
  if (!booking.payOnArrival) {
    return NextResponse.json({ error: "Нельзя подтвердить бронь без оплаты/чека" }, { status: 400 });
  }

  const physicalRoomId = getBookingPhysicalRoomId(booking);
  try {
    if (physicalRoomId) {
      await assertDatesAvailable({
        roomId: physicalRoomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: id
      });
    } else if (booking.roomTypeId) {
      await assertRoomTypeAvailable({
        roomTypeId: booking.roomTypeId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: id
      });
    } else {
      return NextResponse.json({ error: "Бронь без категории номера" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) {
      const msg = "Этот номер уже занят на выбранные даты.";
      if (wantsJson(req)) return NextResponse.json({ ok: false, error: msg }, { status: 409 });
      return NextResponse.redirect(publicUrl(req, `/dashboard/owner?section=bookings&error=dates_conflict`));
    }
    throw e;
  }

  await prisma.booking.update({
    where: { id },
    data: {
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: booking.paymentStatus === "FAILED" ? "PENDING" : booking.paymentStatus
    }
  });

  await autoAssignBookingIfPossible(id);

  if (booking.userId != null) {
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        bookingId: id,
        type: "BOOKING_CONFIRMED",
        isRead: false
      }
    });
  }

  void dispatchBookingConfirmedEmails(id).catch((e) => {
    console.error("[owner/confirm] confirmed emails failed", id, e);
  });

  if (wantsJson(req)) {
    return NextResponse.json({
      ok: true,
      bookingId: id,
      status: BOOKING_STATUS.CONFIRMED,
      message: "Бронь подтверждена, даты отмечены как занятые"
    });
  }

  return NextResponse.redirect(publicUrl(req, `/chat/booking/${id}`));
}
