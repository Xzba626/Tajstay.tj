import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import {
  HOTEL_PERMISSION,
  STAFF_STATUS,
  permissionsForStaffRole,
  type HotelPermission
} from "@/lib/staff/types";

export type HotelAccessContext = {
  user: User;
  hotelId: number;
  via: "OWNER" | "STAFF";
  staffRole?: string | null;
  staffId?: number | null;
  mustChangePassword?: boolean;
};

async function assertOwnerHotel(userId: number, hotelId: number) {
  return prisma.hotel.findFirst({
    where: { id: hotelId, ownerId: userId },
    select: { id: true, name: true, ownerId: true }
  });
}

async function assertActiveStaff(userId: number, hotelId: number) {
  return prisma.hotelStaff.findFirst({
    where: {
      userId,
      hotelId,
      status: STAFF_STATUS.ACTIVE
    }
  });
}

/**
 * Canonical hotel-scoped AuthZ. Owners get full operational access to their hotels.
 * Managers get only permissions from staff policy — never Owner analytics/expenses/staff.
 */
export async function requireHotelPermission(
  userId: number,
  hotelId: number,
  permission: HotelPermission
): Promise<HotelAccessContext> {
  const ownerHotel = await assertOwnerHotel(userId, hotelId);
  if (ownerHotel) {
    return { user: (await prisma.user.findUniqueOrThrow({ where: { id: userId } })), hotelId, via: "OWNER" };
  }

  const staff = await assertActiveStaff(userId, hotelId);
  if (!staff) throw new Error("FORBIDDEN");
  const allowed = permissionsForStaffRole(staff.staffRole);
  if (!allowed.has(permission)) throw new Error("FORBIDDEN");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.isBanned) throw new Error("FORBIDDEN");

  return {
    user,
    hotelId,
    via: "STAFF",
    staffRole: staff.staffRole,
    staffId: staff.id,
    mustChangePassword: staff.mustChangePassword
  };
}

export async function listActiveStaffHotels(userId: number) {
  return prisma.hotelStaff.findMany({
    where: { userId, status: STAFF_STATUS.ACTIVE },
    include: { hotel: { select: { id: true, name: true, city: true, status: true } } },
    orderBy: { createdAt: "asc" }
  });
}

export async function getManagerUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER" || user.isBanned) return null;
  return user;
}

export async function requireManager(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard/manager");
  }
  if (user.role !== "MANAGER" || user.isBanned) {
    redirect("/history?notice=managerOnly");
  }
  return user;
}

/** Owner finance / staff / requisites — Manager never. */
export const OWNER_ONLY_PERMISSIONS = {
  ANALYTICS: "ANALYTICS",
  EXPENSES: "EXPENSES",
  REQUISITES: "REQUISITES",
  STAFF_MANAGE: "STAFF_MANAGE"
} as const;

export async function assertOwnerOnlyHotel(userId: number, hotelId: number) {
  const hotel = await assertOwnerHotel(userId, hotelId);
  if (!hotel) throw new Error("FORBIDDEN");
  return hotel;
}

export { HOTEL_PERMISSION };
