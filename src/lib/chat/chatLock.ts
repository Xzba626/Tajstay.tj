import { BOOKING_STATUS } from "@/lib/domain/booking";

/** BLOCK 5.6D — extracted from messages/route.ts so the write-lock rule is a pure, independently
 * unit-testable function (see scripts/test-block56d-chat-lock.ts) rather than inline route logic. */
export const TERMINAL_NO_NEW_MESSAGES = new Set<string>([
  BOOKING_STATUS.EXPIRED,
  BOOKING_STATUS.CANCELLED,
  "CANCELLED_BY_GUEST",
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.COMPLETED
]);

/**
 * Accepted BLOCK 5.6D archive-policy decision:
 *   A. terminal status, no OPEN dispute       -> locked
 *   B. terminal status, an OPEN dispute exists -> temporarily writable (participants/admin)
 *   C. dispute RESOLVED                        -> the terminal-status lock re-applies immediately
 *   D. cold storage (`chatArchivedAt` set)     -> ALWAYS locked, unconditionally
 *
 * `hasOpenDispute` must be computed by the caller from a fresh `Dispute` query - never cached
 * client-side and never trusted from anything but a fresh read of the current row.
 */
export function isBookingChatLocked(
  booking: { chatArchivedAt: Date | null; status: string },
  hasOpenDispute: boolean
): boolean {
  if (booking.chatArchivedAt) return true;
  if (hasOpenDispute) return false;
  return TERMINAL_NO_NEW_MESSAGES.has(booking.status);
}
