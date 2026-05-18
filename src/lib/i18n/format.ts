import type { Locale } from "./locale";

export function formatDateTimeShort(locale: Locale, d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / (24 * 60 * 60 * 1000));

  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  if (diffDays === 0) return locale === "ru" ? `Сегодня, ${time}` : locale === "tg" ? `Имрӯз, ${time}` : `Today, ${time}`;
  if (diffDays === 1) return locale === "ru" ? `Вчера, ${time}` : locale === "tg" ? `Дирӯз, ${time}` : `Yesterday, ${time}`;

  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(d);
  return `${date}, ${time}`;
}

