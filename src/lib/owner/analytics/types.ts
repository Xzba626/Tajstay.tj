import { BOOKING_SOURCE } from "@/lib/domain/booking";

/** Booking channel axis — independent of settlement (card/cash). */
export type BookingChannel = "online" | "offline" | "unknown";

export function bookingChannelFromSource(source: string | null | undefined): BookingChannel {
  if (source === BOOKING_SOURCE.PLATFORM) return "online";
  if (source === BOOKING_SOURCE.OWNER_MANUAL) return "offline";
  return "unknown";
}

export const EXPENSE_CATEGORY = [
  "UTILITIES",
  "ELECTRICITY",
  "WATER",
  "INTERNET",
  "SALARY",
  "CLEANING",
  "LAUNDRY",
  "REPAIR",
  "SUPPLIES",
  "FOOD",
  "TRANSPORT",
  "TAX",
  "OTHER"
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORY)[number];

export const EXPENSE_RECURRENCE = {
  ONE_TIME: "ONE_TIME",
  MONTHLY: "MONTHLY"
} as const;

export const EXPENSE_STATUS = {
  ACTIVE: "ACTIVE",
  STOPPED: "STOPPED",
  ARCHIVED: "ARCHIVED"
} as const;
