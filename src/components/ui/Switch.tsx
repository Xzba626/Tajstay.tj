"use client";

import { cn } from "@/lib/cn";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

export function Switch({ checked, onChange, disabled, id, "aria-label": ariaLabel, className }: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "tz-switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-emerald-400/50 bg-emerald-600" : "border-slate-300 bg-slate-200",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[1.35rem]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
