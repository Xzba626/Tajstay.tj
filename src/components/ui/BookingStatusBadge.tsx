import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export type BookingStatusKey =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected";

const STATUS_CLASS: Record<BookingStatusKey, string> = {
  pending: "tz-badge--pending",
  confirmed: "tz-badge--confirmed",
  active: "tz-badge--active",
  completed: "tz-badge--completed",
  cancelled: "tz-badge--cancelled",
  rejected: "tz-badge--rejected"
};

const STATUS_I18N: Record<BookingStatusKey, string> = {
  pending: "profile.bookingStatusPending",
  confirmed: "profile.bookingStatusConfirmed",
  active: "profile.bookingStatusActive",
  completed: "profile.bookingStatusCompleted",
  cancelled: "profile.bookingStatusCancelled",
  rejected: "profile.bookingStatusRejected"
};

type Props = {
  status: BookingStatusKey;
  locale: Locale;
  label?: string;
  className?: string;
};

/** TZ Part 1.4 — guest-facing booking status pill (ru/tg/en). */
export function BookingStatusBadge({ status, locale, label, className = "" }: Props) {
  const text = label ?? m(locale, STATUS_I18N[status] as "profile.bookingStatusPending");
  return (
    <span className={`tz-badge ${STATUS_CLASS[status]} ${className}`.trim()}>{text}</span>
  );
}
