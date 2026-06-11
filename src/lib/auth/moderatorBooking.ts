import { prisma } from "@/lib/prisma";
import { moderatorBookingWhere } from "@/lib/pms/moderatorQueries";

export async function getBookingForModerator(bookingId: number, moderatorUserId: number) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      ...moderatorBookingWhere(moderatorUserId)
    },
    include: {
      user: true,
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: { include: { hotel: true } }
    }
  });
}
