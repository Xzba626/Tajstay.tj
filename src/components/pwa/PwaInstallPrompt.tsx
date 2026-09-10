"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstallLabels = {
  title: string;
  body: string;
  install: string;
  dismiss: string;
};

const DISMISS_KEY = "tajstay:pwa-install-dismissed";
const INSTALLED_KEY = "tajstay:pwa-installed";
const COOKIE_CONSENT_KEY = "cookie-consent";
const ENGAGEMENT_DELAY_MS = 15000;

function cookieConsentResolved(): boolean {
  try {
    const v = localStorage.getItem(COOKIE_CONSENT_KEY);
    return v === "accepted" || v === "essential-only";
  } catch {
    return false;
  }
}

export function PwaInstallPrompt({ labels }: { labels: PwaInstallLabels }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  // Must never show at the same time as the cookie banner: wait for consent to be
  // resolved, then require ~15s of active TajStay engagement before it's eligible.
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1" || localStorage.getItem(INSTALLED_KEY) === "1") {
      setHidden(true);
      return;
    }
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setHidden(true);
      return;
    }

    function onInstalled() {
      localStorage.setItem(INSTALLED_KEY, "1");
      setHidden(true);
      setDeferred(null);
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    let timer: number | undefined;
    function startEngagementTimer() {
      if (timer) return;
      timer = window.setTimeout(() => setEngaged(true), ENGAGEMENT_DELAY_MS);
    }

    if (cookieConsentResolved()) {
      startEngagementTimer();
    } else {
      window.addEventListener("tajstay:cookie-consent-resolved", startEngagementTimer, { once: true });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("tajstay:cookie-consent-resolved", startEngagementTimer);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (hidden || !deferred || !engaged) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
    }
    setHidden(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
    setDeferred(null);
  }

  return (
    <div
      className="pwa-install-banner"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-body"
    >
      <div className="flex gap-3">
        <Image
          src={BRAND.favicon}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-2xl object-contain"
          unoptimized
          priority
        />
        <div className="min-w-0 flex-1">
          <p id="pwa-install-title" className="text-sm font-bold text-[#14231b]">
            {labels.title}
          </p>
          <p id="pwa-install-body" className="mt-1 text-xs leading-relaxed text-[#52525b]">
            {labels.body}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="min-h-0 flex-1 rounded-xl bg-[#0f7a4d] px-3 py-2.5 text-xs font-bold text-white transition hover:-translate-y-px"
        >
          {labels.install}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-[#d4d4d8] px-3 py-2.5 text-xs font-semibold text-[#14231b] transition hover:bg-[#f4f4f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7a4d]/50"
        >
          {labels.dismiss}
        </button>
      </div>
    </div>
  );
}
