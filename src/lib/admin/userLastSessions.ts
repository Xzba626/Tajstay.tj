import { prisma } from "@/lib/prisma";

const LOGIN_EVENTS = ["login_phone", "login_firebase", "login_telegram", "login_password", "new_session"] as const;

export type UserLastSession = {
  ip: string | null;
  userAgent: string | null;
  at: Date;
  event: string;
  city: string | null;
  countryCode: string | null;
  systemLanguage: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
};

/** Latest device session per user (prefers UserDeviceSession, falls back to auth audit). */
export async function fetchLastSessionsForUsers(userIds: number[]): Promise<Map<number, UserLastSession>> {
  const map = new Map<number, UserLastSession>();
  if (!userIds.length) return map;

  const deviceRows = await prisma.userDeviceSession.findMany({
    where: { userId: { in: userIds } },
    orderBy: { lastSeenAt: "desc" },
    take: Math.min(userIds.length * 4, 200),
    select: {
      userId: true,
      ip: true,
      userAgent: true,
      city: true,
      countryCode: true,
      systemLanguage: true,
      screenWidth: true,
      screenHeight: true,
      lastSeenAt: true
    }
  });

  for (const row of deviceRows) {
    if (map.has(row.userId)) continue;
    map.set(row.userId, {
      ip: row.ip,
      userAgent: row.userAgent,
      at: row.lastSeenAt,
      event: "device_session",
      city: row.city,
      countryCode: row.countryCode,
      systemLanguage: row.systemLanguage,
      screenWidth: row.screenWidth,
      screenHeight: row.screenHeight
    });
  }

  const missing = userIds.filter((id) => !map.has(id));
  if (!missing.length) return map;

  const logs = await prisma.authAuditLog.findMany({
    where: {
      userId: { in: missing },
      event: { in: [...LOGIN_EVENTS] }
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(missing.length * 5, 200),
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
      event: row.event,
      city: null,
      countryCode: null,
      systemLanguage: null,
      screenWidth: null,
      screenHeight: null
    });
  }

  return map;
}
