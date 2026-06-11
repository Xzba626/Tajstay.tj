import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { USER_ROLE } from "@/lib/auth/permissions";

/** Серверные страницы: только OWNER, иначе редирект. */
export async function requireOwner(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard/owner");
  }
  if (user.role === USER_ROLE.HOTEL_MODERATOR) {
    redirect("/dashboard/moderator?notice=ownerOnly");
  }
  if (user.role !== USER_ROLE.OWNER) {
    redirect("/dashboard/bookings?notice=ownerOnly");
  }
  return user;
}

/** API routes: пользователь-владелец или null (ответ — 403). */
export async function getOwnerUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "OWNER") return null;
  return user;
}
