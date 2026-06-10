import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  permissionsForRole,
  type Permission,
  USER_ROLE,
  type UserRole
} from "@/lib/auth/permissions";

export type HotelAccessContext = {
  userId: number;
  role: UserRole;
  hotelId: number;
  permissions: Permission[];
};

export async function getModeratorHotelIds(userId: number): Promise<number[]> {
  const rows = await prisma.hotelModerator.findMany({
    where: { userId },
    select: { hotelId: true }
  });
  return rows.map((r) => r.hotelId);
}

export async function resolveHotelAccess(
  user: Pick<User, "id" | "role">,
  hotelId: number
): Promise<HotelAccessContext | null> {
  const role = user.role as UserRole;

  if (role === USER_ROLE.ADMIN) {
    const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, deletedAt: null }, select: { id: true } });
    if (!hotel) return null;
    return { userId: user.id, role, hotelId, permissions: permissionsForRole(role) };
  }

  if (role === USER_ROLE.OWNER) {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, ownerId: user.id, deletedAt: null },
      select: { id: true }
    });
    if (!hotel) return null;
    return { userId: user.id, role, hotelId, permissions: permissionsForRole(role) };
  }

  if (role === USER_ROLE.HOTEL_MODERATOR) {
    const assignment = await prisma.hotelModerator.findFirst({
      where: { hotelId, userId: user.id, hotel: { deletedAt: null } },
      select: { hotelId: true }
    });
    if (!assignment) return null;
    return { userId: user.id, role, hotelId, permissions: permissionsForRole(role) };
  }

  return null;
}

export async function requireHotelPermission(
  user: Pick<User, "id" | "role"> | null,
  hotelId: number,
  permission: Permission
): Promise<HotelAccessContext | null> {
  if (!user) return null;
  const access = await resolveHotelAccess(user, hotelId);
  if (!access || !hasPermission(access.permissions, permission)) return null;
  return access;
}

export async function getHotelIdForBooking(bookingId: number): Promise<number | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      room: { select: { hotelId: true } },
      roomType: { select: { hotelId: true } },
      assignedRoom: { select: { hotelId: true } }
    }
  });
  if (!booking) return null;
  return booking.assignedRoom?.hotelId ?? booking.room?.hotelId ?? booking.roomType?.hotelId ?? null;
}

export async function requireBookingPermission(
  user: Pick<User, "id" | "role"> | null,
  bookingId: number,
  permission: Permission
): Promise<HotelAccessContext | null> {
  const hotelId = await getHotelIdForBooking(bookingId);
  if (!hotelId) return null;
  return requireHotelPermission(user, hotelId, permission);
}
