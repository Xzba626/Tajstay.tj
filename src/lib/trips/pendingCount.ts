import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";

const PENDING_STATUSES = [
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW,
  BOOKING_STATUS.PENDING_OWNER
] as const;

export async function getPendingTripsCount(userId: number): Promise<number> {
  return prisma.booking.count({
    where: {
      userId,
      status: { in: [...PENDING_STATUSES] }
    }
  });
}
