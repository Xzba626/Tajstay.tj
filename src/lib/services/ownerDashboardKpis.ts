import { startOfDay, startOfMonth, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE } from "@/lib/domain/booking";

export type OwnerDashboardKpis = {
  bookingsToday: number;
  checkInsToday: number;
  checkOutsToday: number;
  revenueMonth: number;
  unreadMessages: number;
  hotelsPendingModeration: number;
  activeHotels: number;
  pendingOnlineBookings: number;
};

export async function getOwnerDashboardKpis(ownerId: number): Promise<OwnerDashboardKpis> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const ownerRoomFilter = { room: { hotel: { ownerId } } };

  const [
    bookingsToday,
    checkInsToday,
    checkOutsToday,
    revenueMonthAgg,
    unreadMessages,
    hotelsPendingModeration,
    activeHotels,
    pendingOnlineBookings
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        ...ownerRoomFilter,
        createdAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.booking.count({
      where: {
        ...ownerRoomFilter,
        checkIn: { gte: todayStart, lte: todayEnd },
        OR: [
          { source: BOOKING_SOURCE.PLATFORM, status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED", "PENDING_OWNER"] } },
          {
            source: BOOKING_SOURCE.OWNER_MANUAL,
            offlineStatus: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }
          }
        ]
      }
    }),
    prisma.booking.count({
      where: {
        ...ownerRoomFilter,
        checkOut: { gte: todayStart, lte: todayEnd },
        OR: [
          { source: BOOKING_SOURCE.PLATFORM, status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] } },
          {
            source: BOOKING_SOURCE.OWNER_MANUAL,
            offlineStatus: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] }
          }
        ]
      }
    }),
    prisma.booking.aggregate({
      where: {
        ...ownerRoomFilter,
        createdAt: { gte: monthStart },
        OR: [
          { source: BOOKING_SOURCE.PLATFORM, status: "CONFIRMED", paymentStatus: "PAID" },
          {
            source: BOOKING_SOURCE.OWNER_MANUAL,
            offlineStatus: { not: "CANCELLED" }
          }
        ]
      },
      _sum: { totalPrice: true }
    }),
    prisma.chatMessage.count({
      where: {
        readAt: null,
        senderId: { not: ownerId },
        booking: ownerRoomFilter
      }
    }),
    prisma.hotel.count({ where: { ownerId, status: "PENDING" } }),
    prisma.hotel.count({ where: { ownerId, status: "APPROVED" } }),
    prisma.booking.count({
      where: {
        ...ownerRoomFilter,
        source: BOOKING_SOURCE.PLATFORM,
        status: "PENDING_OWNER"
      }
    })
  ]);

  return {
    bookingsToday,
    checkInsToday,
    checkOutsToday,
    revenueMonth: Number(revenueMonthAgg._sum.totalPrice ?? 0),
    unreadMessages,
    hotelsPendingModeration,
    activeHotels,
    pendingOnlineBookings
  };
}
