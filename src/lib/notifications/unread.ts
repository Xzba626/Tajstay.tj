import { prisma } from "@/lib/prisma";

export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  if (!userId) return 0;
  return prisma.notification.count({
    where: {
      userId,
      isRead: false
    }
  });
}

