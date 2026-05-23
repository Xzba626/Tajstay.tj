"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

export function PwaInstallPrompt({ labels }: { labels: PwaInstallLabels }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

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
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !deferred) return null;

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
          src="/logo-mark.svg"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-2xl shadow-md ring-1 ring-[var(--taj-color-border)]"
          unoptimized
          priority
        />
        <div className="min-w-0 flex-1">
          <p id="pwa-install-title" className="text-sm font-bold text-white">
            {labels.title}
          </p>
          <p id="pwa-install-body" className="mt-1 text-xs leading-relaxed text-slate-300">
            {labels.body}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="home-hero-cta-primary min-h-0 flex-1 px-3 py-2.5 text-xs"
        >
          {labels.install}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          {labels.dismiss}
        </button>
      </div>
    </div>
  );
}
