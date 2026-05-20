import type { NotificationCategory } from "@/lib/notifications/categories";
import { notificationCategory } from "@/lib/notifications/categories";

export type NotificationUiCategory =
  | "booking"
  | "message"
  | "payment"
  | "finance"
  | "moderation"
  | "system";

const PAYMENT_TYPES = new Set([
  "PAYMENT_PENDING",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED"
]);

const BOOKING_UI = new Set([
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

export function notificationUiCategory(type: string): NotificationUiCategory {
  if (PAYMENT_TYPES.has(type)) return "payment";
  const base = notificationCategory(type);
  if (base === "messages") return "message";
  if (base === "finance") return "finance";
  if (base === "moderation") return "moderation";
  if (BOOKING_UI.has(type)) return "booking";
  return "system";
}

export type CategoryStyle = {
  bg: string;
  text: string;
  ring: string;
  icon: "booking" | "message" | "payment" | "finance" | "moderation" | "system";
};

export function categoryStyle(cat: NotificationUiCategory): CategoryStyle {
  switch (cat) {
    case "booking":
      return { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-200", icon: "booking" };
    case "message":
      return { bg: "bg-sky-100", text: "text-sky-800", ring: "ring-sky-200", icon: "message" };
    case "payment":
      return { bg: "bg-violet-100", text: "text-violet-800", ring: "ring-violet-200", icon: "payment" };
    case "finance":
      return { bg: "bg-amber-100", text: "text-amber-900", ring: "ring-amber-200", icon: "finance" };
    case "moderation":
      return { bg: "bg-rose-100", text: "text-rose-800", ring: "ring-rose-200", icon: "moderation" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200", icon: "system" };
  }
}

export function categoryFromFilter(cat: NotificationCategory): NotificationUiCategory | null {
  if (cat === "bookings") return "booking";
  if (cat === "messages") return "message";
  if (cat === "finance") return "finance";
  if (cat === "moderation") return "moderation";
  return null;
}
