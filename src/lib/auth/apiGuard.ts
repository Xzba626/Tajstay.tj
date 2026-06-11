import type { User } from "@prisma/client";
import { NextResponse } from "next/server";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSION, USER_ROLE, type Permission } from "@/lib/auth/permissions";
import { requireBookingPermission, requireHotelPermission } from "@/lib/auth/rbac";

export async function requireApiUser(allowedRoles: string[]): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) return forbiddenJson();
  if (!allowedRoles.includes(user.role)) return forbiddenJson();
  return user;
}

export async function requireOwnerApiUser(): Promise<User | NextResponse> {
  return requireApiUser([USER_ROLE.OWNER]);
}

export async function requireModeratorApiUser(): Promise<User | NextResponse> {
  return requireApiUser([USER_ROLE.HOTEL_MODERATOR]);
}

export async function requireHotelApiPermission(
  hotelId: number,
  permission: Permission
): Promise<User | NextResponse> {
  const user = await getSessionUser();
  const access = await requireHotelPermission(user, hotelId, permission);
  if (!access || !user) return forbiddenJson();
  return user;
}

export async function requireBookingApiPermission(
  bookingId: number,
  permission: Permission
): Promise<User | NextResponse> {
  const user = await getSessionUser();
  const access = await requireBookingPermission(user, bookingId, permission);
  if (!access || !user) return forbiddenJson();
  return user;
}

export function isGuardResponse(value: User | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

/** Owner or admin only — blocks HOTEL_MODERATOR from owner APIs. */
export { PERMISSION };
