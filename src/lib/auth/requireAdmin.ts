import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";

/** Серверные страницы: только ADMIN, иначе редирект. */
export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard/admin");
  }
  if (user.role !== "ADMIN") {
    redirect("/dashboard/guest?notice=adminOnly");
  }
  return user;
}

/** API routes: вернуть пользователя или null (ответ — 403). */
export async function getAdminUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
