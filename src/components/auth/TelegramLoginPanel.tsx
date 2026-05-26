"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { linksFromTelegramDeepLink } from "@/lib/telegram/loginChallenge";

export type TelegramLoginLabels = {
  signIn: string;
  title: string;
  subtitle: string;
  stepOpen: string;
  stepStart: string;
  stepEnterCode: string;
  openTelegram: string;
  openTelegramBrowser: string;
  manualHelp: string;
  codeLabel: string;
  codePlaceholder: string;
  verify: string;
  verifying: string;
  codeSuccess: string;
  codeInvalid: string;
  codeExpired: string;
  awaitingPhone: string;
  codeSentHint: string;
  waitingBot: string;
  expired: string;
  errorGeneric: string;
  expiresIn: string;
  tooManyAttempts: string;
  back: string;
  resendOpen: string;
};

type Props = {
  locale: Locale;
  labels: TelegramLoginLabels;
  expanded: boolean;
  onExpandedChange: (active: boolean) => void;
  onSuccess: () => void | Promise<void>;
  onError?: (message: string) => void;
};

type ChallengeState = {
  token: string;
  deepLink: string;
  appDeepLink?: string;
  expiresAt: string;
  expiresInSec: number;
};

type PollStatus = "pending" | "awaiting_phone" | "code_sent" | "expired" | "used" | "not_found";

type CodeUiState = "idle" | "loading" | "success" | "error";

const EMPTY_OTP = ["", "", "", "", "", ""];

const APP_OPEN_DELAY_MS = 1300;
const MANUAL_HELP_DELAY_MS = 4500;

function tryOpenTelegramApp(appUrl: string) {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "display:none;border:0;width:0;height:0";
  iframe.src = appUrl;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 2000);
}

function stepActive(status: PollStatus | null, step: 1 | 2 | 3): boolean {
  if (step === 1) return true;
  if (step === 2) return status === "awaiting_phone" || status === "code_sent";
  return status === "code_sent";
}

export function TelegramLoginPanel({ labels: L, expanded, onExpandedChange, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [webLink, setWebLink] = useState("");
  const [appLink, setAppLink] = useState("");
  const [status, setStatus] = useState<PollStatus | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otp, setOtp] = useState([...EMPTY_OTP]);
  const [otpShake, setOtpShake] = useState(false);
  const [codeUi, setCodeUi] = useState<CodeUiState>("idle");
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [showBrowserFallback, setShowBrowserFallback] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const verifying = useRef(false);
  const openedOnce = useRef(false);

  const otpComplete = otp.every((d) => d.trim().length === 1);

  const resetFlow = useCallback(() => {
    setChallenge(null);
    setStatus(null);
    setOtp([...EMPTY_OTP]);
    setCodeUi("idle");
    setCodeMessage(null);
    setShowBrowserFallback(false);
    setShowManualHelp(false);
    verifying.current = false;
    openedOnce.current = false;
    onExpandedChange(false);
  }, [onExpandedChange]);

  const openTelegram = useCallback(
    (preferApp: boolean) => {
      if (!webLink && !appLink) return;
      if (preferApp && appLink) tryOpenTelegramApp(appLink);
      else if (webLink) window.open(webLink, "_blank", "noopener,noreferrer");
    },
    [appLink, webLink]
  );

  const verifyCode = useCallback(
    async (code: string) => {
      if (!challenge || verifying.current) return;
      if (status === "expired") {
        setCodeUi("error");
        setCodeMessage(L.codeExpired);
        return;
      }
      verifying.current = true;
      setLoading(true);
      setCodeUi("loading");
      setCodeMessage(L.verifying);
      try {
        const res = await fetch("/api/auth/telegram/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: challenge.token, code })
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
        if (!res.ok) {
          setOtpShake(true);
          window.setTimeout(() => setOtpShake(false), 500);
          const reason = json.reason ?? "";
          if (reason === "expired") {
            setStatus("expired");
            setCodeUi("error");
            setCodeMessage(L.codeExpired);
          } else if (reason === "too_many_attempts") {
            setCodeUi("error");
            setCodeMessage(L.tooManyAttempts);
          } else {
            setCodeUi("error");
            setCodeMessage(L.codeInvalid);
          }
          verifying.current = false;
          return;
        }
        setCodeUi("success");
        setCodeMessage(L.codeSuccess);
        await onSuccess();
      } catch (err: unknown) {
        setCodeUi("error");
        setCodeMessage(err instanceof Error ? err.message : L.errorGeneric);
        onError?.(err instanceof Error ? err.message : L.errorGeneric);
        verifying.current = false;
      } finally {
        setLoading(false);
      }
    },
    [challenge, L, onError, onSuccess, status]
  );

  useEffect(() => {
    if (!challenge) return;
    const end = new Date(challenge.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        setStatus("expired");
        setCodeUi("error");
        setCodeMessage(L.codeExpired);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [challenge, L.codeExpired]);

  useEffect(() => {
    if (!challenge || !expanded) return;
    if (status === "expired" || status === "used") return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/auth/telegram/status/${encodeURIComponent(challenge!.token)}`, {
          cache: "no-store"
        });
        const json = (await res.json()) as { status?: PollStatus; phoneMasked?: string };
        if (cancelled) return;
        const s = json.status ?? "not_found";
        setStatus(s);
        if (json.phoneMasked) setPhoneMasked(json.phoneMasked);
        if (s === "expired") {
          setCodeUi("error");
          setCodeMessage(L.codeExpired);
        }
      } catch {
        if (!cancelled) onError?.(L.errorGeneric);
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [challenge, expanded, status, L.codeExpired, L.errorGeneric, onError]);

  useEffect(() => {
    if (!expanded || !challenge || openedOnce.current) return;
    openedOnce.current = true;
    tryOpenTelegramApp(appLink);
    const t1 = window.setTimeout(() => setShowBrowserFallback(true), APP_OPEN_DELAY_MS);
    const t2 = window.setTimeout(() => setShowManualHelp(true), MANUAL_HELP_DELAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [expanded, challenge, appLink]);

  async function startChallenge() {
    setLoading(true);
    verifying.current = false;
    setOtp([...EMPTY_OTP]);
    setCodeUi("idle");
    setCodeMessage(null);
    setShowBrowserFallback(false);
    setShowManualHelp(false);
    openedOnce.current = false;
    try {
      const res = await fetch("/api/auth/telegram/challenge", {
        method: "POST",
        headers: { accept: "application/json" },
        credentials: "include"
      });
      const json = (await res.json().catch(() => ({}))) as ChallengeState & { error?: string };
      if (!res.ok) throw new Error(json.error || L.errorGeneric);

      const links = linksFromTelegramDeepLink(json.deepLink);
      setChallenge(json);
      setWebLink(json.deepLink || links.webLink);
      setAppLink(json.appDeepLink || links.appLink);
      setStatus("pending");
      onExpandedChange(true);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : L.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  const statusHint =
    status === "awaiting_phone"
      ? L.awaitingPhone
      : status === "code_sent"
        ? L.codeSentHint
        : status === "expired"
          ? L.codeExpired
          : status === "pending"
            ? L.waitingBot
            : null;

  if (!expanded) {
    return (
      <button
        type="button"
        className="auth-social-btn auth-social-btn--telegram"
        disabled={loading}
        aria-busy={loading}
        onClick={() => void startChallenge()}
      >
        <TelegramIcon />
        <span>{L.signIn}</span>
      </button>
    );
  }

  return (
    <div className="auth-telegram-flow" role="region" aria-labelledby="telegram-flow-title">
      <div className="auth-telegram-flow__head">
        <h3 id="telegram-flow-title" className="auth-telegram-flow__title">
          {L.title}
        </h3>
        <p className="auth-telegram-flow__subtitle">{L.subtitle}</p>
      </div>

      <ol className="auth-telegram-flow__steps" aria-label={L.title}>
        <li className={stepActive(status, 1) ? "is-active" : ""}>
          <span className="auth-telegram-flow__step-num">1</span>
          {L.stepOpen}
        </li>
        <li className={stepActive(status, 2) ? "is-active" : ""}>
          <span className="auth-telegram-flow__step-num">2</span>
          {L.stepStart}
        </li>
        <li className={stepActive(status, 3) ? "is-active" : ""}>
          <span className="auth-telegram-flow__step-num">3</span>
          {L.stepEnterCode}
        </li>
      </ol>

      <div className="auth-telegram-flow__actions">
        <button
          type="button"
          className="auth-telegram-flow__btn auth-telegram-flow__btn--primary"
          onClick={() => openTelegram(true)}
        >
          <TelegramIcon />
          {L.openTelegram}
        </button>

        {showBrowserFallback ? (
          <a
            href={webLink}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-telegram-flow__btn auth-telegram-flow__btn--secondary"
          >
            {L.openTelegramBrowser}
          </a>
        ) : null}
      </div>

      {showManualHelp ? (
        <p className="auth-telegram-flow__manual" role="note">
          {L.manualHelp}
        </p>
      ) : null}

      {statusHint ? <p className="auth-telegram-flow__status">{statusHint}</p> : null}
      {phoneMasked ? <p className="auth-telegram-flow__phone">{phoneMasked}</p> : null}

      <div className="auth-telegram-flow__code">
        <label className="auth-premium-label" htmlFor="telegram-otp-0">
          {L.codeLabel}
        </label>
        <p className="auth-telegram-flow__placeholder-hint">{L.codePlaceholder}</p>
        <OtpCodeInput
          value={otp}
          onChange={(next) => {
            setOtp(next);
            if (codeUi === "error" || codeUi === "success") {
              setCodeUi("idle");
              setCodeMessage(null);
            }
          }}
          onComplete={(code) => void verifyCode(code)}
          disabled={loading || status === "expired"}
          loading={codeUi === "loading"}
          error={codeUi === "error"}
          success={codeUi === "success"}
          shake={otpShake}
          autoFocus
        />
        {codeMessage ? (
          <p
            className={`auth-telegram-flow__code-msg ${
              codeUi === "success" ? "is-success" : codeUi === "error" ? "is-error" : codeUi === "loading" ? "is-loading" : ""
            }`}
            role={codeUi === "error" ? "alert" : "status"}
          >
            {codeMessage}
          </p>
        ) : null}
        <button
          type="button"
          className="auth-premium-submit"
          disabled={!otpComplete || loading || status === "expired"}
          aria-busy={loading}
          onClick={() => void verifyCode(otp.join(""))}
        >
          {L.verify}
        </button>
      </div>

      <div className="auth-telegram-flow__footer">
        {secondsLeft > 0 ? (
          <p className="auth-telegram-flow__expires">{L.expiresIn.replace("{n}", String(secondsLeft))}</p>
        ) : null}
        <button
          type="button"
          className="auth-telegram-flow__link-btn"
          onClick={() => {
            openedOnce.current = false;
            void startChallenge();
          }}
        >
          {L.resendOpen}
        </button>
        <button type="button" className="auth-telegram-flow__link-btn" onClick={resetFlow}>
          ← {L.back}
        </button>
      </div>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 15.28 9.5 19.5c.43 0 .62-.19.84-.41l2.02-1.93 4.19 3.07c.77.43 1.32.2 1.53-.72l2.78-13.05c.28-1.31-.47-1.82-1.28-1.5L3.9 9.78c-1.27.5-1.25 1.22-.23 1.54l4.47 1.39 10.37-6.55c.49-.32.93-.14.57.18" />
    </svg>
  );
}
