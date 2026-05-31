"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { patchProfileJson, postProfileJson } from "@/components/profile/profileClient";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";

type Props = { locale: Locale };

export function ProfileTelegramChangeClient({ locale }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"open" | "code">("open");
  const [sessionToken, setSessionToken] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postProfileJson("/api/profile/telegram/change/start", {});
      setSessionToken(String(data.sessionToken ?? ""));
      setDeepLink(String(data.deepLink ?? ""));
      setStep("code");
      if (data.deepLink) window.open(String(data.deepLink), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(code: string) {
    if (busy || !sessionToken) return;
    setBusy(true);
    setError(null);
    try {
      await patchProfileJson("/api/profile/telegram/change/confirm", { sessionToken, code });
      router.refresh();
      router.push("/profile/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errTelegramCode"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mockup-screen">
      <Link href="/profile/account" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
        ← {m(locale, "common.back")}
      </Link>
      <h1 className="mockup-screen__title">{m(locale, "profile.changeTelegram")}</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{m(locale, "profile.contactTelegramHint")}</p>

      {step === "open" ? (
        <div className="profile-panel profile-panel--stack mt-4">
          {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void startSession()}>
            {m(locale, "profile.openTelegram")}
          </button>
        </div>
      ) : (
        <div className="profile-panel profile-panel--stack mt-4">
          {deepLink ? (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => window.open(deepLink, "_blank", "noopener,noreferrer")}
            >
              {m(locale, "profile.openTelegram")}
            </button>
          ) : null}
          <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.enterCode")}</p>
          <OtpCodeInput value={otp} onChange={setOtp} onComplete={(code) => void confirmCode(code)} disabled={busy} />
          {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
