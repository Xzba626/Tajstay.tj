import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Authenticated password change (BLOCK 8).
 * Verifies current password, writes new hash, invalidates other sessions (keeps current).
 */
export async function changeAccountPassword(input: {
  userId: number;
  currentPassword: string;
  newPassword: string;
  keepSessionId?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = String(input.currentPassword ?? "");
  const next = String(input.newPassword ?? "");
  if (!current || !next) return { ok: false, error: "invalid" };
  if (next.length < 8) return { ok: false, error: "weak_password" };
  if (current === next) return { ok: false, error: "same_password" };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, password: true }
  });
  if (!user?.password) return { ok: false, error: "no_password" };

  const ok = await verifyPassword(current, user.password);
  if (!ok) return { ok: false, error: "bad_password" };

  const passwordHash = await hashPassword(next);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { password: passwordHash } });
    if (input.keepSessionId) {
      await tx.session.deleteMany({
        where: { userId: user.id, NOT: { id: input.keepSessionId } }
      });
    } else {
      await tx.session.deleteMany({ where: { userId: user.id } });
    }
  });

  return { ok: true };
}
