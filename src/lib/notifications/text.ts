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
  const base = m(locale, `notifications.${type}`) || m(locale, "notifications.unknown");
  if (bookingCode) return `${base} · ${bookingCode}`;
  return base;
}
