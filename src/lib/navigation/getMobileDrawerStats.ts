import { prisma } from "@/lib/prisma";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";

export type MobileDrawerStats = {
  bookingsCount: number;
  favoritesCount: number;
  unreadCount: number;
};

export async function getMobileDrawerStats(userId: number): Promise<MobileDrawerStats> {
  const [bookingsCount, favoritesCount, unreadCount] = await Promise.all([
    prisma.booking.count({ where: { userId } }),
    prisma.favorite.count({ where: { userId } }),
    getUnreadNotificationsCount(userId)
  ]);
  return { bookingsCount, favoritesCount, unreadCount };
}
