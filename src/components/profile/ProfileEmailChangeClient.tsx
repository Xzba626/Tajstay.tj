"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { patchProfileJson, postProfileJson } from "@/components/profile/profileClient";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";

type Props = { locale: Locale };

export function ProfileEmailChangeClient({ locale }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await postProfileJson("/api/profile/email/request", { email: email.trim() });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(code: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await patchProfileJson("/api/profile/email/confirm", { email: email.trim(), code });
      router.refresh();
      router.push("/profile/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errEmailCode"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mockup-screen">
      <Link href="/profile/account" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
        ← {m(locale, "common.back")}
      </Link>
      <h1 className="mockup-screen__title">{m(locale, "profile.email")}</h1>

      {step === "email" ? (
        <form onSubmit={requestCode} className="profile-panel profile-panel--stack mt-4">
          <label className="block">
            <span className="profile-info-row__label">{m(locale, "profile.newEmail")}</span>
            <input
              className="premium-input mt-1.5"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? m(locale, "profile.saving") : m(locale, "profile.continue")}
          </button>
        </form>
      ) : (
        <div className="profile-panel profile-panel--stack mt-4">
          <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.enterCode")}</p>
          <OtpCodeInput
            value={otp}
            onChange={setOtp}
            onComplete={(code) => void confirmCode(code)}
            disabled={busy}
          />
          {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
