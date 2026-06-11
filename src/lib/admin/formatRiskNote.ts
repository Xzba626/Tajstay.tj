import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/** Human-readable label for internal risk notification types (never show raw DB keys). */
export function formatRiskNoteType(locale: Locale, type: string): string {
  const match = /^RISK_FLAG_HOTEL:(\d+):(\d+)$/.exec(type.trim());
  if (match) {
    return m(locale, "admin.riskFlagHotel", { id: match[1], score: match[2] });
  }
  return m(locale, "admin.riskHistoryTitle");
}
