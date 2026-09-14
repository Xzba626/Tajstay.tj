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
export function buildChatInitWelcome(
  localeRaw: string | undefined,
  booking: { expiresAt: Date | null; createdAt: Date; payOnArrival?: boolean }
): string {
  const locale: Locale = normalizeLocale(localeRaw);
  // BLOCK 5.4B: a pay-at-check-in booking is already CONFIRMED with no payment/proof window at
  // all - the Pay Now welcome text (payment/review minutes) would be actively misleading here.
  if (booking.payOnArrival) {
    return m(locale, "chat.welcomePayAtCheckIn");
  }
  const payMin = paymentWindowMinutesFromBooking(booking);
  const reviewMin = 5;
  const template = m(locale, "chat.welcomePayment");
  return template.replace(/\{payMin\}/g, String(payMin)).replace(/\{reviewMin\}/g, String(reviewMin));
}
