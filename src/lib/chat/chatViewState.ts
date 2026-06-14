/** True when the user is on the dedicated booking chat page for this booking. */
export function isViewingBookingChat(pathname: string | null, bookingId: number): boolean {
  if (!pathname) return false;
  return pathname === `/chat/booking/${bookingId}` || pathname.startsWith(`/chat/booking/${bookingId}/`);
}
