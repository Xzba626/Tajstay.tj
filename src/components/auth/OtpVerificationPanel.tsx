"use client";

import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { maskPhoneE164 } from "@/lib/validation/maskPhone";

type Props = {
  phoneE164: string;
  title: string;
  sentToLabel: string;
  retryIn: number;
  retryNowLabel: string;
  retryInLabel: string;
  devHint?: string | null;
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  onResend: () => void;
  verifying?: boolean;
  sending?: boolean;
  error?: boolean;
  success?: boolean;
  shake?: boolean;
};

export function OtpVerificationPanel({
  phoneE164,
  title,
  sentToLabel,
  retryIn,
  retryNowLabel,
  retryInLabel,
  devHint,
  value,
  onChange,
  onComplete,
  onResend,
  verifying,
  sending,
  error,
  success,
  shake
}: Props) {
  const pct = retryIn > 0 ? Math.round((retryIn / 59) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-brand-200">
          {sentToLabel}{" "}
          <span className="font-mono text-[var(--brand-green)]">{maskPhoneE164(phoneE164)}</span>
        </p>
      </div>

      <OtpCodeInput
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={verifying}
        loading={verifying && !success}
        error={error}
        success={success}
        shake={shake}
        autoFocus
      />

      <div className="flex items-center justify-center gap-3 text-xs text-brand-200">
        {retryIn > 0 ? (
          <>
            <span
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-[10px] font-bold text-[var(--brand-green)]"
              aria-hidden
            >
              <svg className="absolute inset-0 h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${pct} 100`}
                  className="text-[var(--brand-green)]"
                />
              </svg>
              {retryIn}
            </span>
            <span>
              {retryInLabel} {retryIn}с
            </span>
          </>
        ) : (
          <button
            type="button"
            disabled={sending}
            onClick={onResend}
            className="font-semibold text-[var(--brand-green)] transition hover:underline disabled:opacity-50"
          >
            {sending ? "…" : retryNowLabel}
          </button>
        )}
      </div>

      {devHint ? (
        <div className="rounded-xl border border-brand-600 bg-brand-800/80 px-3 py-2 text-center text-xs text-brand-200">
          Dev: <span className="font-mono text-white">{devHint}</span>
        </div>
      ) : null}
    </div>
  );
}
