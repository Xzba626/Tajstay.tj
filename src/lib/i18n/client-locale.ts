import { defaultLocale, normalizeLocale, type Locale } from "@/lib/i18n/locale";

/** Read locale from document cookie in client components. */
export function readClientLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(/(?:^|; )tajstay_locale=([^;]*)/);
  return normalizeLocale(match?.[1] ?? defaultLocale);
}
