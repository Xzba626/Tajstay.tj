import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { USER_ROLE } from "@/lib/auth/permissions";

/** Server pages: only HOTEL_MODERATOR (not owner panel). */
export async function requireModerator(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard/moderator");
  }
  if (user.role === USER_ROLE.OWNER) {
    redirect("/dashboard/owner?notice=moderatorOnly");
  }
  if (user.role === USER_ROLE.ADMIN) {
    redirect("/dashboard/admin?notice=moderatorOnly");
  }
  if (user.role !== USER_ROLE.HOTEL_MODERATOR) {
    redirect("/dashboard/bookings?notice=moderatorOnly");
  }
  return user;
}

/** API routes: hotel moderator or null (403). */
export async function getModeratorUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== USER_ROLE.HOTEL_MODERATOR) return null;
  return user;
}
