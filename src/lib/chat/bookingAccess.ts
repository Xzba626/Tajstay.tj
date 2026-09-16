import type { BookingLike } from "@/lib/pms/bookingContext";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { authorizeBookingAccess } from "@/lib/pms/bookingAuthorization";
import { prisma } from "@/lib/prisma";
import { STAFF_STATUS, HOTEL_PERMISSION, permissionsForStaffRole } from "@/lib/staff/types";

export function canAccessBookingChat(
  booking: BookingLike & { userId: number | null },
  user: { id: number; role: string }
): boolean {
  return authorizeBookingAccess(booking, user).allowed;
}

/** Async hotel-scoped check including Manager staff access. */
export async function canAccessBookingChatAsync(
  booking: BookingLike & { userId: number | null },
  user: { id: number; role: string }
): Promise<boolean> {
  if (authorizeBookingAccess(booking, user).allowed) return true;
  if (user.role !== "MANAGER") return false;
  let hotelId: number;
  try {
    hotelId = bookingHotel(booking).id;
  } catch {
    return false;
  }
  const staff = await prisma.hotelStaff.findFirst({
    where: { userId: user.id, hotelId, status: STAFF_STATUS.ACTIVE }
  });
  if (!staff) return false;
  return permissionsForStaffRole(staff.staffRole).has(HOTEL_PERMISSION.CHAT_BOOKING_ACCESS);
}
