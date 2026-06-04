import { prisma } from "@/lib/prisma";

const LOGIN_EVENTS = ["login_phone", "login_firebase", "login_telegram", "login_password", "new_session"] as const;

export type UserLastSession = {
  ip: string | null;
  userAgent: string | null;
  at: Date;
  event: string;
};

/** Latest auth event per user id (for admin users list). */
export async function fetchLastSessionsForUsers(userIds: number[]): Promise<Map<number, UserLastSession>> {
  const map = new Map<number, UserLastSession>();
  if (!userIds.length) return map;

  const logs = await prisma.authAuditLog.findMany({
    where: {
      userId: { in: userIds },
      event: { in: [...LOGIN_EVENTS] }
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(userIds.length * 5, 200),
    select: {
      userId: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      event: true
    }
  });

  for (const row of logs) {
    if (row.userId == null || map.has(row.userId)) continue;
    map.set(row.userId, {
      ip: row.ip,
      userAgent: row.userAgent,
      at: row.createdAt,
      event: row.event
    });
  }

  return map;
}
