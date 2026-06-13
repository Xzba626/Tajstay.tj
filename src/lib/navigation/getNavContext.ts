import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";

export type OwnerAppNavState =
  | { kind: "none" }
  | { kind: "pending" }
  | { kind: "approved" }
  | { kind: "rejected"; comment: string | null };

/**
 * Состояние для UX: заявка владельца (только для GUEST).
 * После approve роль пользователя становится OWNER — пункт «Стать владельцем» не нужен.
 */
export async function getOwnerApplicationNavState(user: User | null): Promise<OwnerAppNavState> {
  if (!user || user.role !== "GUEST") return { kind: "none" };

  try {
    const latest = await prisma.ownerApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    if (!latest) return { kind: "none" };
    if (latest.status === OWNER_APPLICATION_STATUS.PENDING) return { kind: "pending" };
    if (latest.status === OWNER_APPLICATION_STATUS.APPROVED) return { kind: "approved" };
    if (latest.status === OWNER_APPLICATION_STATUS.REJECTED) {
      return { kind: "rejected", comment: latest.rejectionReason ?? latest.comment };
    }
    return { kind: "none" };
  } catch (err) {
    console.error("[getOwnerApplicationNavState]", err);
    return { kind: "none" };
  }
}
