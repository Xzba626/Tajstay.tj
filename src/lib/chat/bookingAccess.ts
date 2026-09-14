import type { BookingLike } from "@/lib/pms/bookingContext";
import { authorizeBookingAccess } from "@/lib/pms/bookingAuthorization";

export function canAccessBookingChat(
  booking: BookingLike & { userId: number | null },
  user: { id: number; role: string }
): boolean {
  return authorizeBookingAccess(booking, user).allowed;
}
