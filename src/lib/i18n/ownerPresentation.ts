import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { BOOKING_SOURCE } from "@/lib/domain/booking";

/** Human label for booking/payment status enums — never show raw codes in Owner UI. */
export function ownerStatusLabel(locale: Locale, raw: string | null | undefined): string {
  const key = String(raw ?? "").trim();
  if (!key) return "—";
  const mapped = m(locale, `status.${key}`);
  return mapped === `status.${key}` ? key : mapped;
}

/** Human label for PLATFORM / OWNER_MANUAL / MANAGER_MANUAL. */
export function ownerBookingSourceLabel(locale: Locale, raw: string | null | undefined): string {
  const key = String(raw ?? "").trim();
  if (!key) return m(locale, "owner.bookingSource.unknown");
  if (key === BOOKING_SOURCE.PLATFORM) return m(locale, "owner.bookingSource.platform");
  if (key === BOOKING_SOURCE.OWNER_MANUAL) return m(locale, "owner.bookingSource.ownerManual");
  if (key === BOOKING_SOURCE.MANAGER_MANUAL) return m(locale, "owner.bookingSource.managerManual");
  const mapped = m(locale, `owner.bookingSource.${key}`);
  return mapped.startsWith("owner.bookingSource.") ? m(locale, "owner.bookingSource.unknown") : mapped;
}
