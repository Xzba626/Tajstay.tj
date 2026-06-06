import type { Locale } from "./locale";
import { normalizeLocale } from "./locale";

/** Map Accept-Language / region hints to TajStay locales. */
export function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header?.trim()) return "en";

  const parts = header
    .split(",")
    .map((p) => p.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const tag of parts) {
    if (tag.startsWith("tg") || tag === "tj") return "tg";
    if (tag.startsWith("ru")) return "ru";
    if (tag.startsWith("en")) return "en";
  }

  return "en";
}

export function localeFromCookieValue(value: string | null | undefined): Locale | null {
  if (!value?.trim()) return null;
  const n = normalizeLocale(value);
  return n;
}
