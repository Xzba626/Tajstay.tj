import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";

/** Серверные страницы: только OWNER, иначе редирект. */
export async function requireOwner(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard/owner");
  }
  if (user.role !== "OWNER") {
    // Send to Become Owner, not History - that page already renders the guest's real
    // application state (none/pending/rejected), so the notice above it can be short and
    // contextual instead of a generic "you're not an OWNER" banner stuck on an unrelated page.
    redirect("/profile/become-owner?notice=ownerOnly");
  }
  return user;
}

/** API routes: пользователь-владелец или null (ответ — 403). */
export async function getOwnerUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "OWNER") return null;
  return user;
}
