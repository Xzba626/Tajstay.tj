import type { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { USER_ROLE, type UserRole } from "@/lib/auth/permissions";

export const ROLE_COOKIE = "tajstay_role";

const VALID_ROLES = new Set<string>(Object.values(USER_ROLE));

export function isValidUserRole(role: string): role is UserRole {
  return VALID_ROLES.has(role);
}

export function setRoleCookie(res: NextResponse, role: string, expires: Date) {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isValidUserRole(role)) return;
  res.cookies.set(ROLE_COOKIE, role, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires
  });
}

export function clearRoleCookie(res: NextResponse) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set(ROLE_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
}

export function readRoleFromRequest(req: NextRequest): UserRole | null {
  const role = req.cookies.get(ROLE_COOKIE)?.value;
  if (!role || !isValidUserRole(role)) return null;
  return role;
}
