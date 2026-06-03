"use client";

import { useCallback, useId, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  /** When true, calls onComplete as soon as 6 digits are entered (legacy). */
  autoSubmitOnComplete?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  shake?: boolean;
  autoFocus?: boolean;
  variant?: "default" | "auth";
};

export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  autoSubmitOnComplete = false,
  disabled,
  loading,
  error,
  success,
  shake,
  autoFocus,
  variant = "default"
}: Props) {
  const uid = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = useCallback(
    (idx: number, digit: string) => {
      const next = [...value];
      next[idx] = digit;
      onChange(next);
      if (digit && idx < 5) refs.current[idx + 1]?.focus();
      const code = next.join("");
      if (autoSubmitOnComplete && code.length === 6 && next.every((d) => d.length === 1)) {
        onComplete?.(code);
      }
    },
    [value, onChange, onComplete, autoSubmitOnComplete]
  );

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]!;
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
    if (autoSubmitOnComplete && digits.length === 6) onComplete?.(digits);
  };

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const boxClass = (filled: boolean) => {
    if (variant === "auth") {
      if (loading) return "taj-otp-cell-input taj-otp-cell-input--loading";
      if (success) return "taj-otp-cell-input taj-otp-cell-input--success";
      if (error) return "taj-otp-cell-input taj-otp-cell-input--error";
      if (filled) return "taj-otp-cell-input taj-otp-cell-input--filled";
      return "taj-otp-cell-input";
    }
    if (loading) return "border-white/10 bg-white/5 text-transparent animate-pulse";
    if (success) return "border-[var(--brand-green)] bg-[rgba(34,197,94,0.18)] text-[var(--brand-green-light)] otp-success-pop";
    if (error) return "border-red-400/70 bg-red-500/10 text-red-200";
    if (filled) return "border-[var(--brand-green)] bg-[rgba(34,197,94,0.1)] text-[var(--brand-green-light)]";
    return "border-white/15 bg-white/5 text-white";
  };

  const cellBase =
    variant === "auth"
      ? "taj-otp-cell-input"
      : "h-[48px] w-[40px] rounded-[10px] border text-center text-xl font-bold outline-none transition-all duration-200 sm:h-[52px] sm:w-[48px] focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/25 disabled:opacity-50";

  return (
    <div
      className={cn(
        variant === "auth" ? "taj-otp-grid" : "flex justify-center gap-1.5 sm:gap-2",
        shake && "otp-shake"
      )}
      onPaste={handlePaste}
    >
      {value.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          id={`${uid}-otp-${idx}`}
          value={loading ? "" : d}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          enterKeyHint="done"
          maxLength={1}
          disabled={disabled || loading}
          aria-label={`Digit ${idx + 1}`}
          onChange={(e) => setDigit(idx, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
          }}
          className={cn(cellBase, boxClass(!!d))}
        />
      ))}
    </div>
  );
}
