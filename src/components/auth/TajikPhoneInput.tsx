"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function TajikPhoneInput({ value, onChange, placeholder = "90 000 00 00", disabled, id }: Props) {
  return (
    <div className="flex items-center rounded-2xl border border-brand-700 bg-brand-900 px-4">
      <span className="pr-2 text-lg font-semibold text-[var(--brand-green)]">+992</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="tel"
        autoComplete="tel-national"
        className="h-14 w-full bg-transparent text-base text-white outline-none disabled:opacity-50"
      />
    </div>
  );
}
