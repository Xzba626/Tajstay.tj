import type { Prisma } from "@prisma/client";
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

/**
 * `Notification` is one shared table across every role (schema.prisma `model Notification`,
 * keyed only by `userId`) — an admin account that has ever also acted as a guest (own booking,
 * own payment) accumulates consumer-context rows under their own userId too. Admin-directed
 * writes always use one of the types below and are never written for a non-admin recipient —
 * confirmed by reading every `prisma.notification.create(Many)` call site in the repo — so
 * filtering on `type` is safe with the existing taxonomy: no schema change, no new type invented.
 * `RISK_FLAG_HOTEL:<id>:<score>` is a templated type written only to `admin.id` in
 * `admin/hotels/moderate/route.ts`, matched via `startsWith`.
 *
 * NOT extended to a general Owner equivalent: `PAYMENT_APPROVED`/`PAYMENT_REJECTED` are written
 * with the SAME type string for both the guest recipient and the owner recipient (only the
 * `userId` differs at write time), so type alone cannot distinguish an owner's own guest-context
 * notification from their hotel's operational one. That needs a real recipient-role tag on write
 * — deliberately left unsolved here rather than guessed at with a heuristic.
 */
const ADMIN_ONLY_NOTIFICATION_TYPES = ["HOTEL_PENDING_REVIEW", "OWNER_APPLICATION_NEW", "BOOKING_CHAT_CREATED"] as const;
const ADMIN_ONLY_NOTIFICATION_TYPE_PREFIX = "RISK_FLAG_HOTEL:";

/**
 * THE single authorization+domain predicate for "an Admin operational notification".
 *
 * Every Admin notification read path must build from this — header bell, Dashboard attention
 * count, the Notifications section's list, and that list's pagination `count()`. They previously
 * used three divergent definitions, and the list/pagination pair had NO `where` clause at all,
 * so the Admin Notifications UI read, counted and paginated over every user's notifications
 * platform-wide and rendered other users' PII (guest name + phone via the `booking` include).
 * Recipient scoping is the security-critical half; the type filter is the domain half.
 */
export function adminNotificationWhere(adminId: number): Prisma.NotificationWhereInput {
  return {
    userId: adminId,
    OR: [
      { type: { in: [...ADMIN_ONLY_NOTIFICATION_TYPES] } },
      { type: { startsWith: ADMIN_ONLY_NOTIFICATION_TYPE_PREFIX } }
    ]
  };
}

export async function getAdminUnreadNotificationsCount(adminId: number, sinceDays = 7): Promise<number> {
  if (!adminId) return 0;
  return prisma.notification.count({
    where: {
      ...adminNotificationWhere(adminId),
      isRead: false,
      createdAt: { gte: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) }
    }
  });
}

/**
 * Predicate for the destructive Admin Notifications cleanup: this admin's own operational
 * notifications older than `threshold`. Never platform-wide — see cleanup/route.ts.
 */
export function adminNotificationCleanupWhere(adminId: number, threshold: Date): Prisma.NotificationWhereInput {
  return { ...adminNotificationWhere(adminId), createdAt: { lt: threshold } };
}

/** Total Admin operational notifications for this admin — pagination denominator for the list. */
export async function getAdminNotificationsCount(adminId: number): Promise<number> {
  if (!adminId) return 0;
  return prisma.notification.count({ where: adminNotificationWhere(adminId) });
}
