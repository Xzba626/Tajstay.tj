import { bookingHotel, type BookingLike } from "@/lib/pms/bookingContext";

export function canAccessBookingChat(
  booking: BookingLike & { userId: number | null },
  user: { id: number; role: string }
): boolean {
  const isGuest = booking.userId != null && booking.userId === user.id;
  let isOwner = false;
  try {
    isOwner = bookingHotel(booking).ownerId === user.id;
  } catch {
    isOwner = false;
  }
  const isAdmin = user.role === "ADMIN";
  return isGuest || isOwner || isAdmin;
}
