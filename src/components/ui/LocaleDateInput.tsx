"use client";

import type { Locale } from "@/lib/i18n/locale";
import { intlLocale } from "@/lib/i18n/format";

/** BLOCK V1 closure: `Intl.DateTimeFormat("tg-TJ", ...)` is not reliably supported by every
 * browser's ICU data - confirmed live in this exact component: Node's ICU renders "1 Декабр
 * 2026" (correct Tajik) but at least one real browser runtime silently fell back to Russian
 * genitive ("1 декабря 2026 г."), which is exactly the RU-leakage-in-TG defect flagged for this
 * block. Rather than trust `Intl` here, this hint text (Wizard-only - `LocaleDateInput` has no
 * other caller) uses a small deterministic table, so it renders identically everywhere. Scoped to
 * this component only - the shared `formatStayDay()` in `src/lib/i18n/format.ts` is used by four
 * unrelated server-rendered surfaces (Trips history, owner subscription cards) where Node's own
 * ICU already produces the correct result; changing it there would be an unrelated blast-radius
 * expansion this fix doesn't need. */
const MONTHS_GENITIVE: Record<Locale, string[]> = {
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  tg: ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};

function formatWizardDay(locale: Locale, date: Date): string {
  const months = MONTHS_GENITIVE[locale] ?? MONTHS_GENITIVE.ru;
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return locale === "en" ? `${month} ${day}, ${year}` : `${day} ${month} ${year}`;
}

type Props = {
  locale: Locale;
  name: string;
  value: string;
  onChange: (value: string) => void;
  label: React.ReactNode;
  required?: boolean;
  className?: string;
  min?: string;
};

/** Native date picker with locale lang + human-readable selected date (not US mm/dd display). */
export function LocaleDateInput({ locale, name, value, onChange, label, required, className, min }: Props) {
  const lang = intlLocale(locale);
  const display =
    value && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
      ? formatWizardDay(locale, new Date(`${value}T12:00:00`))
      : "";

  return (
    <label className="grid gap-1">
      {label}
      <input
        type="date"
        name={name}
        value={value}
        required={required}
        min={min}
        lang={lang}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      {display ? (
        <span className="text-xs text-[var(--taj-color-text-muted)]" aria-live="polite">
          {display}
        </span>
      ) : null}
    </label>
  );
}
