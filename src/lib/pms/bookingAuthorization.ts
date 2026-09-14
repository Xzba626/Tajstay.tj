import { bookingHotel, type BookingLike } from "@/lib/pms/bookingContext";

type AuthUser = { id: number; role: string };

export type BookingAccess = {
  isGuest: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  allowed: boolean;
};

/**
 * The three-way access rule shared by every booking-scoped surface (chat page, chat messages
 * API, and the private-file routes): the booking's own guest, that hotel's owner, or an admin -
 * nobody else. Extracted so it's defined once instead of re-implemented per route.
 */
export function authorizeBookingAccess(
  booking: BookingLike & { userId?: number | null },
  user: AuthUser
): BookingAccess {
  const isGuest = booking.userId != null && booking.userId === user.id;
  let isOwner = false;
  try {
    isOwner = bookingHotel(booking).ownerId === user.id;
  } catch {
    isOwner = false;
  }
  const isAdmin = user.role === "ADMIN";
  return { isGuest, isOwner, isAdmin, allowed: isGuest || isOwner || isAdmin };
}
