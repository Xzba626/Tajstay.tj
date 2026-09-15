import type { Locale } from "./locale";

export function intlLocale(locale: Locale): string {
  if (locale === "tg") return "tg-TJ";
  return locale;
}

/**
 * ADMIN 6.1B root-cause fix: every `Intl.DateTimeFormat`/`Intl.NumberFormat` call in this file
 * used to construct directly with `intlLocale(locale)` and no fallback. This project already
 * found once (BLOCK V1, `LocaleDateInput.tsx`) that `tg-TJ` is not reliably supported by every
 * ICU build — that earlier fix only covered one browser-side component. Server-side, a Node
 * runtime built with small-icu (some serverless platforms use one, even when local dev doesn't)
 * throws a `RangeError` constructing `Intl.DateTimeFormat("tg-TJ", ...)`, which would crash any
 * server component calling these functions with `locale === "tg"` — a plausible, previously-
 * unconsidered explanation for the Admin Notifications 500 reported specifically while the Admin
 * UI was set to Tajik. This wrapper makes every formatter here fail safe: if the requested
 * locale's ICU data is unavailable, fall back to the runtime's default locale (guaranteed to
 * exist) rather than throwing and taking down the whole server component.
 */
function safeIntlFormat(loc: string, options: Intl.DateTimeFormatOptions, date: Date): string {
  try {
    return new Intl.DateTimeFormat(loc, options).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat(undefined, options).format(date);
    } catch {
      return date.toISOString();
    }
  }
}

/** Calendar-day range for hotel stays, e.g. "15–17 августа". */
export function formatStayDateRange(locale: Locale, checkIn: Date, checkOut: Date): string {
  const loc = intlLocale(locale);
  const inDay = checkIn.getUTCDate();
  const outDay = checkOut.getUTCDate();
  const sameMonth = checkIn.getUTCMonth() === checkOut.getUTCMonth() && checkIn.getUTCFullYear() === checkOut.getUTCFullYear();
  const day = (d: Date) => safeIntlFormat(loc, { day: "numeric" }, d);
  const month = (d: Date) => safeIntlFormat(loc, { month: "long" }, d);

  if (sameMonth && inDay !== outDay) {
    return `${day(checkIn)}–${day(checkOut)} ${month(checkIn)}`;
  }
  const full = (d: Date) => safeIntlFormat(loc, { day: "numeric", month: "long", year: "numeric" }, d);
  if (checkIn.getUTCFullYear() === checkOut.getUTCFullYear()) {
    const startOnly = (d: Date) => safeIntlFormat(loc, { day: "numeric", month: "long" }, d);
    return `${startOnly(checkIn)} – ${full(checkOut)}`;
  }
  return `${full(checkIn)} – ${full(checkOut)}`;
}

/** Single calendar day, e.g. for one-day tours. */
export function formatStayDay(locale: Locale, date: Date): string {
  const loc = intlLocale(locale);
  return safeIntlFormat(loc, { day: "numeric", month: "long", year: "numeric" }, date);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  const loc = intlLocale(locale);
  try {
    return new Intl.NumberFormat(loc, options).format(value);
  } catch {
    try {
      return new Intl.NumberFormat(undefined, options).format(value);
    } catch {
      return String(value);
    }
  }
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

  const time = safeIntlFormat(loc, { hour: "2-digit", minute: "2-digit" }, d);
  if (diffDays === 0) return `${mToday(locale)}, ${time}`;
  if (diffDays === 1) return `${mYesterday(locale)}, ${time}`;

  const date = safeIntlFormat(loc, { year: "numeric", month: "long", day: "numeric" }, d);
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
