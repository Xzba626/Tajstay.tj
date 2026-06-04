"use client";

import type { Locale } from "@/lib/i18n/locale";
import { FieldHelp } from "@/components/ui/FieldHelp";

type Props = {
  locale: Locale;
  label: string;
  helpKey?: string;
  variant?: "light" | "dark";
  className?: string;
};

/** Label row with optional localized help tooltip (owner forms, profile). */
export function FieldLabelRow({ locale, label, helpKey, variant = "light", className }: Props) {
  const labelClass =
    variant === "dark"
      ? "text-sm font-semibold text-slate-200"
      : "text-sm font-semibold text-slate-800";

  return (
    <div className={`mb-1.5 flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className={labelClass}>{label}</span>
      {helpKey ? <FieldHelp locale={locale} helpKey={helpKey} variant={variant} /> : null}
    </div>
  );
}
