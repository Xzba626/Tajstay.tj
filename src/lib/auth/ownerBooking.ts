import { prisma } from "@/lib/prisma";

export async function getBookingForOwner(bookingId: number, ownerUserId: number) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [
        { room: { hotel: { ownerId: ownerUserId } } },
        { roomType: { hotel: { ownerId: ownerUserId } } }
      ]
    },
    include: {
      user: true,
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: true
    }
  });
}
