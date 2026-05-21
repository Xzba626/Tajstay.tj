"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";

export type TelegramLoginLabels = {
  signIn: string;
  openBot: string;
  waitingBot: string;
  awaitingConfirm: string;
  confirmed: string;
  expired: string;
  errorGeneric: string;
  expiresIn: string;
  step1: string;
  step2: string;
};

type Props = {
  locale: Locale;
  labels: TelegramLoginLabels;
  onSuccess: () => void | Promise<void>;
  onError?: (message: string) => void;
};

type ChallengeState = {
  token: string;
  deepLink: string;
  expiresAt: string;
  expiresInSec: number;
};

type PollStatus = "pending" | "awaiting_confirm" | "confirmed" | "expired" | "used" | "not_found";

export function TelegramLoginPanel({ labels: L, onSuccess, onError }: Props) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [status, setStatus] = useState<PollStatus | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const completing = useRef(false);

  const finishLogin = useCallback(async () => {
    if (!challenge || completing.current) return;
    completing.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: challenge.token })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || L.errorGeneric);
      await onSuccess();
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : L.errorGeneric);
      completing.current = false;
    } finally {
      setLoading(false);
    }
  }, [challenge, L.errorGeneric, onError, onSuccess]);

  useEffect(() => {
    if (!challenge) return;
    const end = new Date(challenge.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setStatus("expired");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [challenge]);

  useEffect(() => {
    if (!challenge || status !== "confirmed") return;
    void finishLogin();
  }, [challenge, status, finishLogin]);

  useEffect(() => {
    if (!challenge || !active) return;
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
  }, [challenge, active, status, L.errorGeneric, onError]);

  async function startChallenge() {
    setLoading(true);
    setFormLocalError(null);
    completing.current = false;
    try {
      const res = await fetch("/api/auth/telegram/challenge", {
        method: "POST",
        headers: { accept: "application/json" },
        credentials: "include"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || L.errorGeneric);
      setChallenge(json as ChallengeState);
      setStatus("pending");
      setActive(true);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : L.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  const [formLocalError, setFormLocalError] = useState<string | null>(null);

  const statusText =
    status === "awaiting_confirm"
      ? L.awaitingConfirm
      : status === "confirmed"
        ? L.confirmed
        : status === "expired"
          ? L.expired
          : status === "pending" && challenge
            ? L.waitingBot
            : null;

  if (!active) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void startChallenge()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-60"
      >
        <TelegramIcon />
        {loading ? `${L.signIn}…` : L.signIn}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4">
      <p className="text-xs text-brand-200">{L.step1}</p>
      <a
        href={challenge?.deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#229ED9] text-sm font-semibold text-white transition hover:opacity-90"
      >
        <TelegramIcon />
        {L.openBot}
      </a>
      <p className="text-xs text-brand-300">{L.step2}</p>
      {statusText ? <p className="text-sm font-medium text-white">{statusText}</p> : null}
      {secondsLeft > 0 ? (
        <p className="text-xs text-brand-400">
          {L.expiresIn.replace("{n}", String(secondsLeft))}
        </p>
      ) : null}
      {formLocalError ? <p className="text-xs text-red-300">{formLocalError}</p> : null}
      <button
        type="button"
        className="text-xs font-semibold text-brand-300 underline-offset-2 hover:text-white hover:underline"
        onClick={() => {
          setActive(false);
          setChallenge(null);
          setStatus(null);
          completing.current = false;
        }}
      >
        ← Back
      </button>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 15.28 9.5 19.5c.43 0 .62-.19.84-.41l2.02-1.93 4.19 3.07c.77.43 1.32.2 1.53-.72l2.78-13.05c.28-1.31-.47-1.82-1.28-1.5L3.9 9.78c-1.27.5-1.25 1.22-.23 1.54l4.47 1.39 10.37-6.55c.49-.32.93-.14.57.18" />
    </svg>
  );
}
