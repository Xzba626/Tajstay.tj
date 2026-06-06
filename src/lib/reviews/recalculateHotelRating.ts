import { prisma } from "@/lib/prisma";

export async function recalculateHotelRating(hotelId: number): Promise<number> {
  const reviews = await prisma.review.findMany({
    where: {
      booking: {
        OR: [{ room: { hotelId } }, { roomType: { hotelId } }, { assignedRoom: { hotelId } }]
      }
    },
    select: { rating: true }
  });

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const rounded = Math.round(avgRating * 10) / 10;

  await prisma.hotel.update({
    where: { id: hotelId },
    data: { rating: rounded }
  });

  return rounded;
}
