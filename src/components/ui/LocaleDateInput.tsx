"use client";

import type { Locale } from "@/lib/i18n/locale";
import { formatStayDay, intlLocale } from "@/lib/i18n/format";

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
      ? formatStayDay(locale, new Date(`${value}T12:00:00`))
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
        <span className="text-xs text-slate-400" aria-live="polite">
          {display}
        </span>
      ) : null}
    </label>
  );
}
