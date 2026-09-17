"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import type { Locale } from "@/lib/i18n/locale";

const STORAGE_KEY = "tajstay_email_change_v1";

type Step = "form" | "otp" | "done";

type Stored = {
  email: string;
  expiresAt: string;
  step: Step;
};

type Labels = {
  title: string;
  subtitle: string;
  currentLabel: string;
  newLabel: string;
  codeLabel: string;
  sendCode: string;
  verify: string;
  resend: string;
  success: string;
  back: string;
  errors: Record<string, string>;
};

function loadStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.email || !parsed?.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(v: Stored | null) {
  if (typeof window === "undefined") return;
  if (!v) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

export function ProfileEmailChangeClient({
  locale,
  currentEmailDisplay,
  labels
}: {
  locale: Locale;
  currentEmailDisplay: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStored();
    if (!stored) return;
    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      saveStored(null);
      return;
    }
    setEmail(stored.email);
    setExpiresAt(stored.expiresAt);
    setStep(stored.step === "done" ? "form" : stored.step);
  }, []);

  const errMsg = useCallback(
    (key: string) => labels.errors[key] || labels.errors.generic || key,
    [labels.errors]
  );

  async function sendChallenge() {
    setError(null);
    const res = await fetch("/api/profile/email/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; expiresAt?: string };
    if (!res.ok) {
      setError(errMsg(data.error || "generic"));
      return;
    }
    const next: Stored = { email: email.trim().toLowerCase(), expiresAt: data.expiresAt!, step: "otp" };
    saveStored(next);
    setExpiresAt(data.expiresAt!);
    setStep("otp");
  }

  async function verify() {
    setError(null);
    const res = await fetch("/api/profile/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(errMsg(data.error || "generic"));
      return;
    }
    saveStored(null);
    setStep("done");
    startTransition(() => router.refresh());
  }

  return (
    <ProfileSubpageShell locale={locale} title={labels.title} subtitle={labels.subtitle}>
      <div className="profile-subpage-contact">
        <div className="profile-subpage-contact__icon" aria-hidden>
          <Mail size={32} strokeWidth={1.5} />
        </div>
        <div className="profile-subpage-contact__value">{currentEmailDisplay}</div>
        <p className="profile-subpage-contact__hint">{labels.currentLabel}</p>

        {step === "done" ? (
          <p className="profile-subpage-contact__hint" role="status">
            {labels.success}
          </p>
        ) : null}

        {step === "form" || step === "done" ? (
          <form
            className="mt-4 grid gap-3 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              void sendChallenge();
            }}
          >
            <label className="grid gap-1 text-sm">
              <span>{labels.newLabel}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[var(--ts-border,rgba(20,35,27,0.16))] bg-[var(--ts-surface-card,#fff)] px-3 text-[var(--ts-text-primary,#14231b)]"
              />
            </label>
            {error ? (
              <p className="text-sm text-[var(--ts-danger,#b42318)]" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="profile-subpage-contact__action min-h-[44px]"
            >
              {labels.sendCode}
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form
            className="mt-4 grid gap-3 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
          >
            <p className="text-sm text-[var(--ts-text-secondary,#3d5248)]">
              {email}
              {expiresAt ? ` · ${new Date(expiresAt).toLocaleTimeString()}` : null}
            </p>
            <label className="grid gap-1 text-sm">
              <span>{labels.codeLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="min-h-[44px] rounded-xl border border-[var(--ts-border,rgba(20,35,27,0.16))] bg-[var(--ts-surface-card,#fff)] px-3 tracking-[0.3em] text-[var(--ts-text-primary,#14231b)]"
              />
            </label>
            {error ? (
              <p className="text-sm text-[var(--ts-danger,#b42318)]" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={pending || code.length !== 6} className="profile-subpage-contact__action min-h-[44px]">
              {labels.verify}
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-[var(--ts-border,rgba(20,35,27,0.16))] px-3 text-sm font-semibold"
              onClick={() => void sendChallenge()}
            >
              {labels.resend}
            </button>
            <button
              type="button"
              className="min-h-[44px] text-sm underline"
              onClick={() => {
                setStep("form");
                setCode("");
                setError(null);
              }}
            >
              {labels.back}
            </button>
          </form>
        ) : null}
      </div>
    </ProfileSubpageShell>
  );
}
