import type { Locale } from "./locale";

export function intlLocale(locale: Locale): string {
  if (locale === "tg") return "tg-TJ";
  return locale;
}

/** Calendar-day range for hotel stays, e.g. "15–17 августа". */
export function formatStayDateRange(locale: Locale, checkIn: Date, checkOut: Date): string {
  const loc = intlLocale(locale);
  const inDay = checkIn.getUTCDate();
  const outDay = checkOut.getUTCDate();
  const sameMonth = checkIn.getUTCMonth() === checkOut.getUTCMonth() && checkIn.getUTCFullYear() === checkOut.getUTCFullYear();
  const dayFmt = new Intl.DateTimeFormat(loc, { day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat(loc, { month: "long" });

  if (sameMonth && inDay !== outDay) {
    return `${dayFmt.format(checkIn)}–${dayFmt.format(checkOut)} ${monthFmt.format(checkIn)}`;
  }
  const yearFmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" });
  if (checkIn.getUTCFullYear() === checkOut.getUTCFullYear()) {
    const startOnly = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long" });
    return `${startOnly.format(checkIn)} – ${yearFmt.format(checkOut)}`;
  }
  return `${yearFmt.format(checkIn)} – ${yearFmt.format(checkOut)}`;
}

/** Single calendar day, e.g. for one-day tours. */
export function formatStayDay(locale: Locale, date: Date): string {
  const loc = intlLocale(locale);
  return new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

/** Amount + currency with locale grouping; TJS falls back when Intl has no currency symbol. */
export function formatMoney(locale: Locale, amount: number, currency = "TJS"): string {
  const loc = intlLocale(locale);
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${formatNumber(locale, n)} ${currency}`;
  }
}

export function formatDateTimeShort(locale: Locale, d: Date): string {
  const loc = intlLocale(locale);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / (24 * 60 * 60 * 1000));

  const time = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(d);
  if (diffDays === 0) return `${mToday(locale)}, ${time}`;
  if (diffDays === 1) return `${mYesterday(locale)}, ${time}`;

  const date = new Intl.DateTimeFormat(loc, { year: "numeric", month: "long", day: "numeric" }).format(d);
  return `${date}, ${time}`;
}

function mToday(locale: Locale): string {
  if (locale === "ru") return "Сегодня";
  if (locale === "tg") return "Имрӯз";
  return "Today";
}

function mYesterday(locale: Locale): string {
  if (locale === "ru") return "Вчера";
  if (locale === "tg") return "Дирӯз";
  return "Yesterday";
}

