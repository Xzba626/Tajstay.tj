"use client";

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

export function PwaInstallPrompt({ labels }: { labels: PwaInstallLabels }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("tajstay:pwa-install-dismissed") === "1") {
      setHidden(true);
      return;
    }
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setHidden(true);
      return;
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
  }

  function dismiss() {
    localStorage.setItem("tajstay:pwa-install-dismissed", "1");
    setHidden(true);
    setDeferred(null);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[110] w-[min(100vw-2rem,24rem)] -translate-x-1/2 rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <p className="text-sm font-semibold text-white">{labels.title}</p>
      <p className="mt-1 text-xs text-slate-300">{labels.body}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
        >
          {labels.install}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
        >
          {labels.dismiss}
        </button>
      </div>
    </div>
  );
}
