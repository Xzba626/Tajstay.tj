import type { Locale } from "@/lib/i18n/locale";

export type CurrencyCode = "TJS" | "RUB" | "USD";

export function detectLocaleFromAcceptLanguage(header: string | null): Locale | null {
  const raw = (header ?? "").toLowerCase();
  if (raw.includes("tg") || raw.includes("tj")) return "tg";
  if (raw.includes("ru")) return "ru";
  if (raw.includes("en")) return "en";
  return null;
}

export function detectLocaleFromNavigator(lang: string): Locale {
  const lc = lang.toLowerCase();
  if (lc.startsWith("tg") || lc === "tj") return "tg";
  if (lc.startsWith("ru")) return "ru";
  return "en";
}

export function defaultCurrencyForLocale(locale: Locale): CurrencyCode {
  if (locale === "tg") return "TJS";
  if (locale === "ru") return "RUB";
  return "USD";
}
