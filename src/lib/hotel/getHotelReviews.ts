import { prisma } from "@/lib/prisma";

export function getHotelReviewsForDisplay(hotelId: number) {
  return prisma.review.findMany({
    where: {
      OR: [{ booking: { room: { hotelId } } }, { booking: { roomType: { hotelId } } }]
    },
    include: { booking: { include: { user: true } } },
    orderBy: { createdAt: "desc" }
  });
}
