import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AuditDb = Prisma.TransactionClient | typeof prisma;

export async function writeOwnerHotelAudit(
  input: {
    hotelId: number;
    actorUserId: number | null;
    actorRole?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | number | null;
    beforeState?: unknown;
    afterState?: unknown;
    metadata?: unknown;
  },
  db: AuditDb = prisma
) {
  await db.ownerHotelAuditLog.create({
    data: {
      hotelId: input.hotelId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      beforeState: input.beforeState != null ? JSON.stringify(input.beforeState) : null,
      afterState: input.afterState != null ? JSON.stringify(input.afterState) : null,
      metadata: input.metadata != null ? JSON.stringify(input.metadata) : null
    }
  });
}
