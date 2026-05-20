export function canAccessBookingChat(
  booking: { userId: number | null; room: { hotel: { ownerId: number } } },
  user: { id: number; role: string }
): boolean {
  const isGuest = booking.userId != null && booking.userId === user.id;
  const isOwner = booking.room.hotel.ownerId === user.id;
  const isAdmin = user.role === "ADMIN";
  return isGuest || isOwner || isAdmin;
}
