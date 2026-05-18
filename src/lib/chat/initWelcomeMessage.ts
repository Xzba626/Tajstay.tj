import type { Locale } from "@/lib/i18n/locale";
import { normalizeLocale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function paymentWindowMinutesFromBooking(booking: { expiresAt: Date | null; createdAt: Date }): number {
  if (booking.expiresAt) {
    const ms = booking.expiresAt.getTime() - booking.createdAt.getTime();
    const mins = Math.round(ms / 60_000);
    if (Number.isFinite(mins) && mins > 0 && mins < 24 * 60) return mins;
  }
  return 20;
}

/** Текст системного приветствия при первом init чата (с префиксом 🛡️ для UI). */
export function buildChatInitWelcome(localeRaw: string | undefined, booking: { expiresAt: Date | null; createdAt: Date }): string {
  const locale: Locale = normalizeLocale(localeRaw);
  const payMin = paymentWindowMinutesFromBooking(booking);
  const reviewMin = 5;
  const template = m(locale, "chat.welcomePayment");
  return template.replace(/\{payMin\}/g, String(payMin)).replace(/\{reviewMin\}/g, String(reviewMin));
}
