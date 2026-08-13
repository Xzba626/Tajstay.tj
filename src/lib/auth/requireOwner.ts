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
