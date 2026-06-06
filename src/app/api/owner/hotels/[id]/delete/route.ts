import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { BOOKING_SOURCE } from "@/lib/domain/booking";
import { ACTIVE_OFFLINE_BOOKING_STATUSES, INACTIVE_ONLINE_BOOKING_STATUSES } from "@/lib/booking/availability";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({
    where: { id, ownerId: owner.id, status: { not: "DELETED" } }
  });
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activeBookings = await prisma.booking.count({
    where: {
      room: { hotelId: id },
      OR: [
        {
          source: BOOKING_SOURCE.PLATFORM,
          status: { notIn: [...INACTIVE_ONLINE_BOOKING_STATUSES] }
        },
        {
          source: BOOKING_SOURCE.OWNER_MANUAL,
          offlineStatus: { in: [...ACTIVE_OFFLINE_BOOKING_STATUSES] }
        }
      ]
    }
  });

  if (activeBookings > 0) {
    return NextResponse.json(
      {
        error: `Нельзя удалить: есть ${activeBookings} активных броней. Дождитесь их завершения или отмените вручную.`
      },
      { status: 409 }
    );
  }

  await prisma.hotel.update({
    where: { id },
    data: {
      status: "DELETED",
      deletedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}
