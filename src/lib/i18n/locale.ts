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
/** Set on first auto-detect (Accept-Language). */
export const LOCALE_AUTO_COOKIE = "tajstay_locale_auto";
/** Set when user explicitly picks a language (switcher / profile). */
export const LOCALE_MANUAL_COOKIE = "tajstay_locale_manual";
/** Shown once after auto-detect banner is dismissed or confirmed. */
export const LOCALE_PROMPT_DONE_COOKIE = "tajstay_locale_prompt_done";

export function normalizeLocale(input?: string | null): Locale {
  if (input === "ru" || input === "en" || input === "tg") return input;
  if (input === "tj") return "tg";
  return defaultLocale;
}
