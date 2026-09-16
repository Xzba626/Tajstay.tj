"use client";

import { useMemo } from "react";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/locale";

export function useLocale(): Locale {
  return useMemo(() => {
    if (typeof document === "undefined") return "ru";
    try {
      const raw = document.cookie
        .split(";")
        .map((p) => p.trim())
        .find((p) => p.startsWith(`${LOCALE_COOKIE}=`));
      const v = raw ? decodeURIComponent(raw.split("=").slice(1).join("=")) : "";
      return normalizeLocale(v);
    } catch {
      return "ru";
    }
  }, []);
}
