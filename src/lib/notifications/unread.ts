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
 * own payment) accumulates consumer-context rows under their own userId too. The Admin header
 * bell/KPI previously counted ALL unread rows for `userId: admin.id` with no `type` filter, so
 * those consumer rows would inflate the "admin operational" badge — confirmed by reading every
 * `prisma.notification.create(Many)` call site in the repo (Admin+Owner+Guest visual pass,
 * 2026-09-19): admin-directed writes always use one of the types below and are never written for
 * a non-admin recipient, so filtering on `type` here is safe with the existing taxonomy — no
 * schema change, no new type invented. `RISK_FLAG_HOTEL:<id>:<score>` is a templated type written
 * only to `admin.id` in `admin/hotels/moderate/route.ts`, matched via `startsWith`.
 * NOT extended to a general Owner equivalent: `PAYMENT_APPROVED`/`PAYMENT_REJECTED` are written
 * with the SAME type string for both the guest recipient and the owner recipient (only the
 * `userId` differs at write time) — type alone cannot distinguish an owner's own guest-context
 * notification from their hotel's operational one. That gap needs a real recipient-role tag,
 * not a type-string heuristic — left BLOCKED, not guessed at, per the scope this was authorized
 * under.
 */
const ADMIN_ONLY_NOTIFICATION_TYPES = ["HOTEL_PENDING_REVIEW", "OWNER_APPLICATION_NEW", "BOOKING_CHAT_CREATED"] as const;
const ADMIN_ONLY_NOTIFICATION_TYPE_PREFIX = "RISK_FLAG_HOTEL:";

export async function getAdminUnreadNotificationsCount(adminId: number, sinceDays = 7): Promise<number> {
  if (!adminId) return 0;
  return prisma.notification.count({
    where: {
      userId: adminId,
      isRead: false,
      createdAt: { gte: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) },
      OR: [
        { type: { in: [...ADMIN_ONLY_NOTIFICATION_TYPES] } },
        { type: { startsWith: ADMIN_ONLY_NOTIFICATION_TYPE_PREFIX } }
      ]
    }
  });
}

