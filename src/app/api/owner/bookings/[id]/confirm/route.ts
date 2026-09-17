import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { getBookingForOwner } from "@/lib/auth/ownerBooking";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { assertDatesAvailable, DatesUnavailableError, withRoomOverlapGuard } from "@/lib/booking/availability";
import { autoAssignBookingIfPossible } from "@/lib/pms/assignment";
import { assertRoomTypeAvailable, RoomTypeUnavailableError, withRoomTypeCapacityGuard } from "@/lib/pms/inventory";
import { getBookingPhysicalRoomId } from "@/lib/pms/types";

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
  if (!physicalRoomId && !booking.roomTypeId) {
    return NextResponse.json({ error: "Бронь без категории номера" }, { status: 400 });
  }
  const confirmData = {
    status: BOOKING_STATUS.CONFIRMED,
    paymentStatus: booking.paymentStatus === "FAILED" ? "PENDING" : booking.paymentStatus
  } as const;

  // Check-then-write folded into one atomic operation per branch - see paymentReviewActions.ts
  // for the identical pattern and full rationale (physical room: DB EXCLUDE constraint;
  // room-type-only: per-roomType advisory lock, since there's no physical room column to range-
  // exclude on yet).
  try {
    if (physicalRoomId) {
      await assertDatesAvailable({
        roomId: physicalRoomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: id
      });
      await withRoomOverlapGuard(() => prisma.booking.update({ where: { id }, data: confirmData }));
    } else {
      const roomTypeId = booking.roomTypeId!;
      await withRoomTypeCapacityGuard(roomTypeId, async (tx) => {
        await assertRoomTypeAvailable({
          roomTypeId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          excludeBookingId: id,
          client: tx
        });
        await tx.booking.update({ where: { id }, data: confirmData });
      });
    }
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) {
      const msg = "Этот номер уже занят на выбранные даты.";
      if (wantsJson(req)) return NextResponse.json({ ok: false, error: msg }, { status: 409 });
      return NextResponse.redirect(publicUrl(req, `/dashboard/owner?section=bookings&error=dates_conflict`));
    }
    throw e;
  }

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

  const { queueBookingConfirmationDelivery } = await import("@/lib/bookings/bookingConfirmationDelivery");
  queueBookingConfirmationDelivery(id, "booking.confirmed.pay_on_arrival");

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
