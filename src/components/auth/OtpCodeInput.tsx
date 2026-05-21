"use client";

import { useCallback, useId, useRef } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  autoFocus?: boolean;
};

export function OtpCodeInput({ value, onChange, onComplete, disabled, error, success, autoFocus }: Props) {
  const uid = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = useCallback(
    (idx: number, digit: string) => {
      const next = [...value];
      next[idx] = digit;
      onChange(next);
      if (digit && idx < 5) refs.current[idx + 1]?.focus();
      const code = next.join("");
      if (code.length === 6 && next.every((d) => d.length === 1)) onComplete?.(code);
    },
    [value, onChange, onComplete]
  );

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]!;
    onChange(next);
    const focusIdx = Math.min(digits.length, 5);
    refs.current[focusIdx]?.focus();
    if (digits.length === 6) onComplete?.(digits);
  };

  const boxClass = (filled: boolean) => {
    if (success) return "border-[var(--brand-green)] bg-[rgba(34,197,94,0.15)] text-[var(--brand-green-light)]";
    if (error) return "border-red-400/60 bg-red-500/10 text-red-200";
    if (filled) return "border-[var(--brand-green)] bg-[rgba(34,197,94,0.1)] text-[var(--brand-green-light)]";
    return "border-white/15 bg-white/5 text-white";
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {value.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          id={`${uid}-otp-${idx}`}
          value={d}
          type="text"
          inputMode="numeric"
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && idx === 0}
          aria-label={`Digit ${idx + 1}`}
          onChange={(e) => setDigit(idx, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
          }}
          className={`h-[52px] w-[44px] rounded-[10px] border text-center text-xl font-bold outline-none transition sm:w-[52px] ${boxClass(!!d)} disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
