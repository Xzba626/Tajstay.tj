import { prisma } from "@/lib/prisma";
import { STAFF_ROLE, type HotelStaffRole } from "@/lib/pms/types";

export type StaffPermission =
  | "assign_rooms"
  | "check_in_out"
  | "offline_booking"
  | "view_calendar"
  | "view_finances"
  | "view_guest_pii"
  | "change_housekeeping"
  | "manage_rooms";

const ROLE_PERMISSIONS: Record<HotelStaffRole, StaffPermission[]> = {
  [STAFF_ROLE.RECEPTIONIST]: [
    "assign_rooms",
    "check_in_out",
    "offline_booking",
    "view_calendar",
    "view_guest_pii"
  ],
  [STAFF_ROLE.MANAGER]: [
    "assign_rooms",
    "check_in_out",
    "offline_booking",
    "view_calendar",
    "view_guest_pii",
    "manage_rooms"
  ],
  [STAFF_ROLE.HOUSEKEEPING]: ["view_calendar", "change_housekeeping"]
};

const OWNER_PERMISSIONS: StaffPermission[] = [
  "assign_rooms",
  "check_in_out",
  "offline_booking",
  "view_calendar",
  "view_finances",
  "view_guest_pii",
  "change_housekeeping",
  "manage_rooms"
];

export async function resolveHotelAccess(userId: number, userRole: string, hotelId: number) {
  if (userRole === "OWNER") {
    const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId: userId }, select: { id: true } });
    if (!hotel) return null;
    return { hotelId, staffRole: null as HotelStaffRole | null, permissions: OWNER_PERMISSIONS };
  }
  if (userRole === "ADMIN") {
    return { hotelId, staffRole: null, permissions: OWNER_PERMISSIONS };
  }
  const staff = await prisma.hotelStaff.findFirst({
    where: { hotelId, userId },
    select: { staffRole: true }
  });
  if (!staff) return null;
  const role = staff.staffRole as HotelStaffRole;
  return { hotelId, staffRole: role, permissions: ROLE_PERMISSIONS[role] ?? [] };
}

export function hasPermission(permissions: StaffPermission[], perm: StaffPermission): boolean {
  return permissions.includes(perm);
}

/** Mask phone/email for staff without view_guest_pii */
export function maskGuestContact(
  value: string | null | undefined,
  canViewPii: boolean
): string | undefined {
  if (!value?.trim()) return undefined;
  if (canViewPii) return value.trim();
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••• ${digits.slice(-4)}`;
}
