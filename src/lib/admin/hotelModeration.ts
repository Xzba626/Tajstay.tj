import { prisma } from "@/lib/prisma";

/**
 * The most recent Admin moderation reason for a Hotel, read back from AdminAuditLog - no new
 * Hotel column needed, this table already exists and already has a `reason` field for exactly
 * this kind of "why did an admin action happen" record.
 */
export async function getLatestHotelModerationReason(hotelId: number): Promise<string | null> {
  const entry = await prisma.adminAuditLog.findFirst({
    where: { targetType: "Hotel", targetId: String(hotelId), action: "hotel_moderated", reason: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { reason: true }
  });
  return entry?.reason ?? null;
}
