"use client";

import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
  helpKey: string;
  variant?: "light" | "dark";
};

export function FieldHelp({ locale, helpKey, variant = "light" }: Props) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const hint = m(locale, `forms.help.${helpKey}.hint`);
  const example = m(locale, `forms.help.${helpKey}.example`);

  return (
    <span
      className={`field-help field-help--${variant}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="field-help__trigger"
        aria-label={m(locale, "forms.help.ariaLabel")}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <CircleHelp size={16} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <span id={popoverId} role="tooltip" className="field-help__popover">
          <span className="field-help__hint">{hint}</span>
          <span className="field-help__example">{example}</span>
        </span>
      ) : null}
    </span>
  );
}
