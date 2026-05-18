import type { UserRole } from "@/lib/auth/requireAuth";

export function isAllowedRole(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}

