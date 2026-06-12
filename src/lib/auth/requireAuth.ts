import { getSessionUser } from "@/lib/auth/session";

export type UserRole = "GUEST" | "OWNER" | "ADMIN";

export async function requireUser(allowedRoles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) return null;
  return user;
}

