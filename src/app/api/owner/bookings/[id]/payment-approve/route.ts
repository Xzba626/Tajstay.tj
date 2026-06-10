import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { assertDatesAvailable, DatesUnavailableError } from "@/lib/booking/availability";
import { assertRoomTypeAvailable, RoomTypeUnavailableError } from "@/lib/pms/inventory";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";
import { createNotification } from "@/lib/notifications/create";
import { dispatchBookingConfirmedEmails } from "@/lib/email/bookingEmailDispatch";

const ALLOWED_STATUSES = [
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW
] as const;

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Некорректный id" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      OR: [
        { room: { hotel: { ownerId: owner.id } } },
        { roomType: { hotel: { ownerId: owner.id } } },
        { assignedRoom: { hotel: { ownerId: owner.id } } }
      ]
    },
    include: {
      ...bookingWithHotelInclude,
      user: { select: { id: true, email: true, name: true } },
      payment: true
    }
  });

  if (!booking) {
    return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
  }

  const hotel = bookingHotel(booking);

  if (!ALLOWED_STATUSES.includes(booking.status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json(
      { error: `Нельзя подтвердить оплату для статуса ${booking.status}` },
      { status: 400 }
    );
  }

  const physicalRoomId = booking.assignedRoomId ?? booking.roomId;
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
    }
  } catch (e) {
    if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) {
      return NextResponse.json({ error: "Номер занят на выбранные даты" }, { status: 409 });
    }
    throw e;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.booking.update({
      where: { id },
      data: {
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: "PAID",
        paymentApprovedAt: new Date(),
        paymentApprovedById: owner.id,
        proofReviewedAt: booking.proofReviewedAt ?? new Date(),
        proofReviewedById: booking.proofReviewedById ?? owner.id
      }
    });

    if (booking.payment && booking.payment.status === "PENDING") {
      await tx.payment.update({ where: { id: booking.payment.id }, data: { status: "CAPTURED" } });
    }

    await tx.transactionLog.create({
      data: {
        bookingId: id,
        paymentId: booking.payment?.id,
        type: "PAYMENT_CONFIRMED_BY_OWNER",
        payload: JSON.stringify({ ownerId: owner.id, hotelId: hotel.id, at: new Date().toISOString() })
      }
    });

    return next;
  });

  await addBookingSystemMessage({
    bookingId: id,
    message: "🛡️ Система: Хозяин подтвердил получение оплаты. Приятного пребывания!"
  }).catch(() => undefined);

  if (booking.userId != null) {
    await createNotification({
      userId: booking.userId,
      type: "BOOKING_PAYMENT_CONFIRMED",
      message: "Хозяин подтвердил получение оплаты. Приятного пребывания!",
      bookingId: id,
      link: `/chat/booking/${id}`
    });
  }

  void dispatchBookingConfirmedEmails(id).catch((e) => {
    console.error("[owner/payment-approve] confirmed emails failed", id, e);
  });

  return NextResponse.json({ ok: true, booking: updated });
}
