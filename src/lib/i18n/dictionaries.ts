/**
 * Совместимость: `t` для hero + поиска. Новый код — `m(locale, "path")` из `./messages`.
 */
import type { Locale } from "./locale";
import { defaultLocale, localeLabels, locales } from "./locale";
import { m, tSearch } from "./messages";

export type { Locale };
export { defaultLocale, localeLabels, locales };
export { m, tSearch } from "./messages";

type SearchKey = Parameters<typeof tSearch>[1];

export function t(
  locale: Locale,
  key: "brandTagline" | "heroTitle" | "heroSubtitle" | SearchKey
): string {
  if (key === "brandTagline") return m(locale, "header.tagline");
  if (key === "heroTitle") return m(locale, "home.heroTitle");
  if (key === "heroSubtitle") return m(locale, "home.heroSubtitle");
  return tSearch(locale, key);
}
