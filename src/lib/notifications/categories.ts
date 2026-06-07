export type NotificationCategory =
  | "all"
  | "unread"
  | "bookings"
  | "messages"
  | "finance"
  | "moderation";

const BOOKING_TYPES = new Set([
  "NEW_BOOKING",
  "OWNER_OFFLINE_BOOKING_CREATED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "BOOKING_REJECTED",
  "BOOKING_EXPIRED",
  "CHECK_IN_REMINDER",
  "CHECK_OUT_REMINDER",
  "REVIEW_AVAILABLE"
]);

const MESSAGE_TYPES = new Set(["BOOKING_CHAT_NEW", "ADMIN_MESSAGE"]);

const FINANCE_TYPES = new Set(["PAYMENT_RECEIVED", "PAYMENT_FAILED", "PAYOUT_SENT", "REFUND_PROCESSED"]);

const MODERATION_TYPES = new Set([
  "HOTEL_APPROVED",
  "HOTEL_REJECTED",
  "HOTEL_NEEDS_CHANGES",
  "HOTEL_PENDING_REVIEW",
  "NEW_COMPLAINT",
  "DISPUTE_OPENED",
  "OWNER_APPLICATION_PENDING"
]);

export function notificationCategory(type: string): NotificationCategory {
  if (MESSAGE_TYPES.has(type)) return "messages";
  if (FINANCE_TYPES.has(type)) return "finance";
  if (MODERATION_TYPES.has(type)) return "moderation";
  if (BOOKING_TYPES.has(type)) return "bookings";
  return "bookings";
}

export function matchesCategory(type: string, category: NotificationCategory): boolean {
  if (category === "all" || category === "unread") return true;
  return notificationCategory(type) === category;
}
