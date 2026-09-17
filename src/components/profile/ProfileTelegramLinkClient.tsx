"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import type { Locale } from "@/lib/i18n/locale";

type Labels = {
  title: string;
  subtitle: string;
  currentLabel: string;
  connect: string;
  change: string;
  openTelegram: string;
  waiting: string;
  success: string;
  hint: string;
  errors: Record<string, string>;
};

export function ProfileTelegramLinkClient({
  locale,
  currentDisplay,
  connected,
  labels
}: {
  locale: Locale;
  currentDisplay: string;
  connected: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "waiting" | "done">("idle");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const errMsg = (key: string) => labels.errors[key] || labels.errors.generic || key;

  async function startLink() {
    setError(null);
    stopPoll();
    const res = await fetch("/api/profile/telegram/challenge", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      deepLink?: string;
      appDeepLink?: string;
    };
    if (!res.ok) {
      setError(errMsg(data.error || "generic"));
      return;
    }
    setDeepLink(data.deepLink || null);
    setPhase("waiting");
    if (data.appDeepLink || data.deepLink) {
      window.open(data.appDeepLink || data.deepLink, "_blank", "noopener,noreferrer");
    }
    pollRef.current = setInterval(() => {
      void pollStatus();
    }, 2000);
  }

  async function pollStatus() {
    const res = await fetch("/api/profile/telegram/status", { method: "GET", cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
    if (data.status === "completed") {
      stopPoll();
      setPhase("done");
      startTransition(() => router.refresh());
      return;
    }
    if (data.status === "expired" || data.status === "conflict" || data.status === "used") {
      stopPoll();
      setPhase("idle");
      setError(errMsg(data.status === "conflict" ? "telegram_taken" : data.status || "generic"));
    }
  }

  return (
    <ProfileSubpageShell locale={locale} title={labels.title} subtitle={labels.subtitle}>
      <div className="profile-subpage-contact">
        <div className="profile-subpage-contact__icon" aria-hidden>
          <Send size={32} strokeWidth={1.5} />
        </div>
        <div className="profile-subpage-contact__value">{currentDisplay}</div>
        <p className="profile-subpage-contact__hint">{labels.currentLabel}</p>
        <p className="profile-subpage-contact__hint">{labels.hint}</p>

        {phase === "done" ? (
          <p className="profile-subpage-contact__hint" role="status">
            {labels.success}
          </p>
        ) : null}

        {phase === "waiting" ? (
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-[var(--ts-text-secondary,#3d5248)]" role="status">
              {labels.waiting}
            </p>
            {deepLink ? (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-subpage-contact__action min-h-[44px] inline-flex items-center justify-center"
              >
                {labels.openTelegram}
              </a>
            ) : null}
          </div>
        ) : null}

        {phase === "idle" || phase === "done" ? (
          <button
            type="button"
            disabled={pending}
            className="profile-subpage-contact__action min-h-[44px] mt-4"
            onClick={() => void startLink()}
          >
            {connected ? labels.change : labels.connect}
          </button>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-[var(--ts-danger,#b42318)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ProfileSubpageShell>
  );
}
