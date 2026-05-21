"use client";

import { formatTajikNationalDisplay } from "@/lib/validation/phone";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function TajikPhoneInput({ value, onChange, placeholder = "90 000 00 00", disabled, id }: Props) {
  const display = formatTajikNationalDisplay(value);

  return (
    <div className="flex items-center rounded-2xl border border-brand-700 bg-brand-900 px-4">
      <span className="pr-2 text-lg font-semibold text-[var(--brand-green)]">+992</span>
      <input
        id={id}
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^992/, "").slice(0, 9))}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="tel-national"
        className="h-14 w-full bg-transparent text-base tracking-wide text-white outline-none disabled:opacity-50"
      />
    </div>
  );
}
