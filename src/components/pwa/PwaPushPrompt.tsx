"use client";

import { useEffect, useState } from "react";

export type PwaPushLabels = {
  title: string;
  enable: string;
  later: string;
  unsupported: string;
};

import { urlBase64ToUint8Array } from "@/lib/push/vapid";

export function PwaPushPrompt({ labels, enabled }: { labels: PwaPushLabels; enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("tajstay:push-prompt-dismissed") === "1") return;
    const t = window.setTimeout(() => setVisible(true), 8000);
    return () => window.clearTimeout(t);
  }, [enabled]);

  if (!visible) return null;

  async function enablePush() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setVisible(false);
        return;
      }
      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) throw new Error("no vapid");
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) throw new Error("no key");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON())
      });
      setVisible(false);
    } catch {
      /* VAPID not configured or denied */
    } finally {
      setBusy(false);
    }
  }

  function later() {
    localStorage.setItem("tajstay:push-prompt-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-[109] w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md md:bottom-24">
      <p className="text-xs font-semibold text-white">{labels.title}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void enablePush()}
          className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {labels.enable}
        </button>
        <button type="button" onClick={later} className="rounded-lg px-2 py-1.5 text-[11px] text-slate-400 hover:text-white">
          {labels.later}
        </button>
      </div>
    </div>
  );
}
