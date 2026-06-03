"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { patchProfileJson, postProfileJson } from "@/components/profile/profileClient";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { ProfileAccountScreen } from "@/components/profile/ProfileAccountScreen";
import { dispatchProfileUpdated } from "@/lib/auth/authEvents";
import { formatTelegram } from "@/lib/format/maskEmail";

type PollStatus = "awaiting_bot" | "code_sent" | "expired" | "used" | "confirmed" | "not_found";

type Props = {
  locale: Locale;
  currentTelegramLabel: string;
  currentTelegramId: string | null;
};

export function ProfileTelegramChangeClient({ locale, currentTelegramLabel, currentTelegramId }: Props) {
  const router = useRouter();
  const [displayLabel, setDisplayLabel] = useState(currentTelegramLabel);
  const [step, setStep] = useState<"open" | "code">("open");
  const [sessionToken, setSessionToken] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [pollStatus, setPollStatus] = useState<PollStatus>("awaiting_bot");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = otp.join("");
  const botReady = pollStatus === "code_sent";

  useEffect(() => {
    setDisplayLabel(currentTelegramLabel);
  }, [currentTelegramLabel]);

  async function startSession() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postProfileJson("/api/profile/telegram/change/start", {}, locale);
      setSessionToken(String(data.sessionToken ?? ""));
      setDeepLink(String(data.deepLink ?? ""));
      setPollStatus("awaiting_bot");
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
    if (step !== "code" || !sessionToken || success) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/profile/telegram/change/status?sessionToken=${encodeURIComponent(sessionToken)}`,
          { cache: "no-store", credentials: "include" }
        );
        const json = (await res.json()) as {
          status?: PollStatus;
          ready?: boolean;
          telegramId?: string | null;
          telegramUsername?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 429) return;
          return;
        }

        const status = json.status ?? "not_found";
        setPollStatus(status);

        if (status === "expired" || status === "used" || status === "confirmed") {
          cancelled = true;
          if (status === "confirmed" && json.telegramId) {
            const label =
              formatTelegram(json.telegramUsername, json.telegramId) ??
              m(locale, "profile.telegramNotConnected");
            setDisplayLabel(label);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }

    void poll();
    const id = window.setInterval(() => {
      if (cancelled) return;
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, sessionToken, success, locale]);

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

      const newId = String(data.telegramId ?? "");
      if (!newId) {
        throw new Error(m(locale, "profile.errTelegramCode"));
      }

      const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const meJson = (await meRes.json()) as { user?: { telegramId?: string | null } };
      if (!meRes.ok || meJson.user?.telegramId !== newId) {
        throw new Error(m(locale, "profile.errSave"));
      }

      const label =
        formatTelegram(
          typeof data.telegramUsername === "string" ? data.telegramUsername : null,
          newId
        ) ?? m(locale, "profile.telegramNotConnected");

      setDisplayLabel(label);
      setSuccess(true);
      setPollStatus("confirmed");

      dispatchProfileUpdated({
        telegramId: newId,
        telegramUsername: typeof data.telegramUsername === "string" ? data.telegramUsername : null
      });

      router.refresh();

      window.setTimeout(() => {
        router.push("/profile/account/telegram");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errTelegramCode"));
    } finally {
      setBusy(false);
    }
  }

  const pollBlocked = pollStatus === "expired";

  return (
    <ProfileAccountScreen
      backHref="/profile/account"
      backLabel={m(locale, "common.back")}
      title={m(locale, "profile.changeTelegram")}
      hint={m(locale, "profile.contactTelegramHint")}
    >
      <div className="profile-panel profile-panel--stack mt-4">
        <p className="text-sm text-[var(--text-muted)]">
          {m(locale, "profile.telegramCurrent")}: <span className="font-semibold text-white">{displayLabel}</span>
        </p>
        {currentTelegramId ? (
          <p className="text-xs text-[var(--text-muted)]">ID {currentTelegramId}</p>
        ) : null}
      </div>

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
            {pollStatus === "expired"
              ? m(locale, "auth.telegramExpired")
              : botReady
                ? m(locale, "profile.enterCode")
                : m(locale, "profile.telegramAwaitBot")}
          </p>
          <OtpCodeInput
            value={otp}
            onChange={setOtp}
            disabled={busy || success || pollBlocked}
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
              disabled={busy || code.length !== 6 || pollBlocked}
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
