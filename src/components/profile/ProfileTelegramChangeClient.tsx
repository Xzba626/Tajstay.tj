"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { patchProfileJson, postProfileJson } from "@/components/profile/profileClient";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { ProfileAccountScreen } from "@/components/profile/ProfileAccountScreen";

type Props = { locale: Locale };

export function ProfileTelegramChangeClient({ locale }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"open" | "code">("open");
  const [sessionToken, setSessionToken] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [botReady, setBotReady] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = otp.join("");

  async function startSession() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postProfileJson("/api/profile/telegram/change/start", {}, locale);
      setSessionToken(String(data.sessionToken ?? ""));
      setDeepLink(String(data.deepLink ?? ""));
      setBotReady(false);
      setOtp(["", "", "", "", "", ""]);
      setStep("code");
      if (data.deepLink) window.open(String(data.deepLink), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "code" || !sessionToken) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/profile/telegram/change/status?sessionToken=${encodeURIComponent(sessionToken)}`,
          { cache: "no-store", credentials: "include" }
        );
        const json = (await res.json()) as { ready?: boolean };
        if (!cancelled) setBotReady(Boolean(json.ready));
      } catch {
        /* ignore poll errors */
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, sessionToken]);

  async function confirmCode() {
    if (busy || !sessionToken || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const data = await patchProfileJson(
        "/api/profile/telegram/change/confirm",
        { sessionToken, code },
        locale
      );
      if (!data.telegramId) {
        throw new Error(m(locale, "profile.errTelegramCode"));
      }
      setSuccess(true);
      window.setTimeout(() => {
        router.refresh();
        router.push("/profile/account");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errTelegramCode"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileAccountScreen
      backHref="/profile/account"
      backLabel={m(locale, "common.back")}
      title={m(locale, "profile.changeTelegram")}
      hint={m(locale, "profile.contactTelegramHint")}
    >
      {step === "open" ? (
        <div className="profile-panel profile-panel--stack mt-4">
          {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void startSession()}>
            {busy ? m(locale, "profile.saving") : m(locale, "profile.openTelegram")}
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
          <p className="text-sm text-[var(--text-muted)]">
            {botReady ? m(locale, "profile.enterCode") : m(locale, "profile.telegramAwaitBot")}
          </p>
          <OtpCodeInput
            value={otp}
            onChange={setOtp}
            disabled={busy || success}
            success={success}
            autoFocus
          />
          {success ? (
            <motion.p
              className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-400"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              role="status"
            >
              <span aria-hidden>✓</span>
              {m(locale, "auth.telegramCodeSuccess")}
            </motion.p>
          ) : (
            <button
              type="button"
              className="btn-primary w-full"
              disabled={busy || code.length !== 6}
              onClick={() => void confirmCode()}
            >
              {busy ? m(locale, "auth.telegramVerifying") : m(locale, "auth.telegramVerify")}
            </button>
          )}
          {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
        </div>
      )}
    </ProfileAccountScreen>
  );
}
