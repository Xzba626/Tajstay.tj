import type { Locale } from "./locale";
import { m } from "./messages";

/** All booking.status values that may appear in UI (current + legacy). */
export const BOOKING_STATUS_I18N_KEYS = [
  "WAITING_PAYMENT",
  "WAIT_PROOF",
  "ON_REVIEW",
  "PENDING_OWNER",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "CANCELLED_BY_GUEST",
  "EXPIRED"
] as const;

export type BookingStatusI18nKey = (typeof BOOKING_STATUS_I18N_KEYS)[number];

function translateStatusKey(locale: Locale, status: string): string | undefined {
  const path = `status.${status}`;
  const label = m(locale, path);
  return label !== path ? label : undefined;
}

/** Human-readable booking status; never returns raw enum when a message exists. */
export function formatBookingStatus(locale: Locale, status: string): string {
  const normalized = status.trim();
  if (!normalized) return "—";
  return translateStatusKey(locale, normalized) ?? humanizeStatusToken(normalized);
}

/** Human-readable payment status (paymentStatus column). */
export function formatPaymentStatus(locale: Locale, status: string): string {
  return formatBookingStatus(locale, status);
}

function humanizeStatusToken(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
