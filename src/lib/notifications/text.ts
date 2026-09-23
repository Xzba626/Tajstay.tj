import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function notificationText(
  locale: Locale,
  type: string,
  bookingCode?: string | null,
  stored?: { title?: string | null; message?: string | null }
): string {
  const custom = stored?.title?.trim() || stored?.message?.trim();
  if (custom) {
    const base = custom;
    if (bookingCode) return `${base} · ${bookingCode}`;
    return base;
  }
  // Some types are templated at write time (`RISK_FLAG_HOTEL:<hotelId>:<score>`), so look up the
  // label by the type name alone — otherwise the whole raw enum string was shown to the admin.
  const typeKey = type.split(":")[0];
  const looked = m(locale, `notifications.${typeKey}`);
  const base = looked && looked !== `notifications.${typeKey}` ? looked : m(locale, "notifications.unknown");
  if (bookingCode) return `${base} · ${bookingCode}`;
  return base;
}
