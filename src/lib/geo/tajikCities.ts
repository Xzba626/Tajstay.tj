import { TST_CITIES } from "@/lib/ai/tstIntent";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/** Canonical city keys used in search, owner applications, and hotel records. */
export const TAJIK_CITY_CANONICAL = TST_CITIES.map((c) => c.canonical);

export type TajikCityCanonical = (typeof TAJIK_CITY_CANONICAL)[number];

/** Map localized / alias input to canonical city name. Returns null if unknown. */
export function normalizeTajikCity(input: string): string | null {
  const raw = input.trim();
  if (raw.length < 2) return null;

  for (const entry of TST_CITIES) {
    if (entry.canonical.toLowerCase() === raw.toLowerCase()) return entry.canonical;
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() === raw.toLowerCase()) return entry.canonical;
    }
  }

  return null;
}

export function isKnownTajikCity(input: string): boolean {
  return normalizeTajikCity(input) !== null;
}

export function cityDisplayLabel(locale: Locale, canonical: string): string {
  const key = `tstAssistant.city.${canonical}`;
  const label = m(locale, key);
  return label === key ? canonical : label;
}
