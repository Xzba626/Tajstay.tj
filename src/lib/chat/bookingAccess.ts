import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/lib/auth/permissions";
import { bookingHotel, type BookingLike } from "@/lib/pms/bookingContext";

export async function canAccessBookingChat(
  booking: BookingLike & { userId: number | null },
  user: { id: number; role: string }
): Promise<boolean> {
  const isGuest = booking.userId != null && booking.userId === user.id;
  if (isGuest) return true;
  if (user.role === USER_ROLE.ADMIN) return true;

  let hotelId: number;
  let ownerId: number;
  try {
    const hotel = bookingHotel(booking);
    hotelId = hotel.id;
    ownerId = hotel.ownerId;
  } catch {
    return false;
  }

  if (user.role === USER_ROLE.OWNER) {
    return ownerId === user.id;
  }

  if (user.role === USER_ROLE.HOTEL_MODERATOR) {
    const assignment = await prisma.hotelModerator.findFirst({
      where: { userId: user.id, hotelId },
      select: { id: true }
    });
    return !!assignment;
  }

  return false;
}
