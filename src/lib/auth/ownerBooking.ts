import { prisma } from "@/lib/prisma";

export async function getBookingForOwner(bookingId: number, ownerUserId: number) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      room: { hotel: { ownerId: ownerUserId } }
    },
    include: {
      user: true,
      room: { include: { hotel: true } }
    }
  });
}
