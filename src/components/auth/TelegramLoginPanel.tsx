"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { useCountdown } from "@/hooks/useCountdown";
import { linksFromTelegramDeepLink } from "@/lib/telegram/loginChallenge";

export type TelegramLoginLabels = {
  signIn: string;
  title: string;
  browserFallback: string;
  codeExpired: string;
  otpExpired: string;
  expiresIn: string;
  requestNew: string;
  backToSignIn: string;
  verifying: string;
  codeSuccess: string;
  codeInvalid: string;
  tooManyAttempts: string;
  errorGeneric: string;
};

type Props = {
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

function tryOpenTelegramApp(appUrl: string) {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "display:none;border:0;width:0;height:0";
  iframe.src = appUrl;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 2000);
}

function formatTimerLabel(template: string, formatted: string) {
  return template.replace("{time}", formatted).replace("{n}", formatted);
}

export function TelegramLoginPanel({ labels: L, expanded, onExpandedChange, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [webLink, setWebLink] = useState("");
  const [appLink, setAppLink] = useState("");
  const [status, setStatus] = useState<PollStatus | null>(null);
  const [otp, setOtp] = useState([...EMPTY_OTP]);
  const [otpShake, setOtpShake] = useState(false);
  const [codeUi, setCodeUi] = useState<CodeUiState>("idle");
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const verifying = useRef(false);
  const openedOnce = useRef(false);
  const expandStarted = useRef(false);

  const { formatted, expired: timerExpired } = useCountdown({
    expiresAt: challenge?.expiresAt,
    enabled: expanded && Boolean(challenge)
  });

  const isExpired = timerExpired || status === "expired";

  const resetFlow = useCallback(() => {
    setChallenge(null);
    setStatus(null);
    setOtp([...EMPTY_OTP]);
    setCodeUi("idle");
    setCodeMessage(null);
    verifying.current = false;
    openedOnce.current = false;
    onExpandedChange(false);
  }, [onExpandedChange]);

  const openTelegramBrowser = useCallback(() => {
    if (webLink) window.open(webLink, "_blank", "noopener,noreferrer");
  }, [webLink]);

  const verifyCode = useCallback(
    async (code: string) => {
      if (!challenge || verifying.current || isExpired) return;
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
            setCodeMessage(L.otpExpired);
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
    [challenge, isExpired, L, onError, onSuccess]
  );

  useEffect(() => {
    if (!timerExpired || !challenge) return;
    setStatus("expired");
    setCodeUi("error");
    setCodeMessage(L.otpExpired);
  }, [timerExpired, challenge, L.otpExpired]);

  useEffect(() => {
    if (!challenge || !expanded) return;
    if (status === "expired" || status === "used") return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/auth/telegram/status/${encodeURIComponent(challenge!.token)}`, {
          cache: "no-store"
        });
        const json = (await res.json()) as { status?: PollStatus };
        if (cancelled) return;
        const s = json.status ?? "not_found";
        setStatus(s);
        if (s === "expired") {
          setCodeUi("error");
          setCodeMessage(L.otpExpired);
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
  }, [challenge, expanded, status, L.otpExpired, L.errorGeneric, onError]);

  useEffect(() => {
    if (!expanded || !challenge || openedOnce.current) return;
    openedOnce.current = true;
    if (appLink) tryOpenTelegramApp(appLink);
  }, [expanded, challenge, appLink]);

  async function startChallenge(activateFlow = true) {
    setLoading(true);
    verifying.current = false;
    setOtp([...EMPTY_OTP]);
    setCodeUi("idle");
    setCodeMessage(null);
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
      if (activateFlow) onExpandedChange(true);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : L.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!expanded) {
      expandStarted.current = false;
      return;
    }
    if (!challenge && !loading && !expandStarted.current) {
      expandStarted.current = true;
      void startChallenge(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start when expanded panel mounts
  }, [expanded, challenge, loading]);

  if (!expanded) {
    return (
      <button
        type="button"
        className="taj-social-button"
        disabled={loading}
        aria-busy={loading}
        onClick={() => onExpandedChange(true)}
      >
        <SendIcon />
        <span>{L.signIn}</span>
      </button>
    );
  }

  return (
    <div className="taj-telegram-panel taj-telegram-panel--compact" role="region" aria-labelledby="telegram-flow-title">
      <div className="taj-auth-welcome taj-auth-welcome-compact taj-auth-welcome--minimal">
        <h1 id="telegram-flow-title">{L.title}</h1>
      </div>

      {!isExpired ? (
        <p className="taj-timer taj-timer--mmss" aria-live="polite">
          {formatTimerLabel(L.expiresIn, formatted)}
        </p>
      ) : (
        <p className="taj-form-error taj-form-error--compact" role="alert">
          {L.otpExpired}
        </p>
      )}

      <div className="taj-otp-wrap">
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
          disabled={loading || isExpired}
          loading={codeUi === "loading"}
          error={codeUi === "error" && !isExpired}
          success={codeUi === "success"}
          shake={otpShake}
          autoFocus
        />
      </div>

      {codeMessage && !isExpired ? (
        <p
          className={`taj-code-message ${
            codeUi === "success" ? "taj-code-message-success" : codeUi === "error" ? "taj-code-message-error" : ""
          }`}
          role={codeUi === "error" ? "alert" : "status"}
        >
          {codeUi === "success" ? <CheckIcon /> : null}
          {codeMessage}
        </p>
      ) : null}

      {webLink ? (
        <button type="button" className="taj-secondary-button" disabled={loading} onClick={openTelegramBrowser}>
          {L.browserFallback}
        </button>
      ) : null}

      {isExpired ? (
        <button
          type="button"
          className="taj-primary-button"
          disabled={loading}
          onClick={() => {
            openedOnce.current = false;
            expandStarted.current = false;
            void startChallenge(false);
          }}
        >
          {L.requestNew}
        </button>
      ) : null}

      <button type="button" className="taj-back-button" onClick={resetFlow}>
        {L.backToSignIn}
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg className="taj-social-icon taj-social-icon--telegram" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 15.28 9.5 19.5c.43 0 .62-.19.84-.41l2.02-1.93 4.19 3.07c.77.43 1.32.2 1.53-.72l2.78-13.05c.28-1.31-.47-1.82-1.28-1.5L3.9 9.78c-1.27.5-1.25 1.22-.23 1.54l4.47 1.39 10.37-6.55c.49-.32.93-.14.57.18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
