import { BOOKING_STATUS } from "@/lib/domain/booking";

const TERMINAL_STATUSES = [
  BOOKING_STATUS.CANCELLED,
  "CANCELLED_BY_GUEST",
  BOOKING_STATUS.EXPIRED
] as const;

const LOCKED_AFTER_CONFIRM_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.COMPLETED
] as const;

/** Whether a guest may cancel their booking (payment page, chat, cancel APIs). */
export function guestBookingCancelAllowed(input: { status: string; paymentStatus: string }): boolean {
  if ((TERMINAL_STATUSES as readonly string[]).includes(input.status)) return false;
  if ((LOCKED_AFTER_CONFIRM_STATUSES as readonly string[]).includes(input.status)) return false;
  if (input.paymentStatus === "PAID") return false;
  return true;
}
