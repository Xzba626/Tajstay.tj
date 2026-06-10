import type { Locale } from "@/lib/i18n/locale";

export type PropertyTypeRow = {
  id: string;
  code: string;
  nameRu: string;
  nameTg: string;
  nameEn: string;
  icon: string | null;
};

export function propertyTypeLabel(locale: Locale, row: PropertyTypeRow): string {
  if (locale === "tg") return row.nameTg;
  if (locale === "en") return row.nameEn;
  return row.nameRu;
}
