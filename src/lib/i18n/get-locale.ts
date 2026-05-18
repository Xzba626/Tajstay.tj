import { cookies } from "next/headers";
import type { Locale } from "./locale";
import { LOCALE_COOKIE, defaultLocale, normalizeLocale } from "./locale";

export function getLocale(): Locale {
  try {
    const v = cookies().get(LOCALE_COOKIE)?.value;
    return normalizeLocale(v);
  } catch {
    /* cookies() outside request */
  }
  return defaultLocale;
}
