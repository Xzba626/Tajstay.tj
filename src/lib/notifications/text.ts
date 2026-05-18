import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function notificationText(locale: Locale, type: string, bookingCode?: string | null): string {
  const base = m(locale, `notifications.${type}`) || m(locale, "notifications.unknown");
  if (bookingCode) return `${base} · ${bookingCode}`;
  return base;
}

