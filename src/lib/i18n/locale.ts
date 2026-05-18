export type Locale = "ru" | "tg" | "en";

export const locales: Locale[] = ["ru", "tg", "en"];

export const localeLabels: Record<Locale, string> = {
  ru: "Русский",
  tg: "Тоҷикӣ",
  en: "English"
};

export const localeShort: Record<Locale, string> = {
  ru: "RU",
  tg: "TJ",
  en: "EN"
};

export const defaultLocale: Locale = "ru";

export const LOCALE_COOKIE = "tajstay_locale";

export function normalizeLocale(input?: string | null): Locale {
  if (input === "ru" || input === "en" || input === "tg") return input;
  if (input === "tj") return "tg";
  return defaultLocale;
}
