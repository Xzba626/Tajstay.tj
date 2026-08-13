"use client";

import { useEffect, useState } from "react";
import { NOTIFICATION_TOAST_EVENT } from "@/lib/pwa/notificationEvents";

type OnceToast = { message: string };

export function GlobalToast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("toast:once");
      if (!raw) return;
      sessionStorage.removeItem("toast:once");
      const parsed = JSON.parse(raw) as Partial<OnceToast>;
      if (parsed?.message) setMsg(String(parsed.message));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onNotif(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setMsg(String(detail.message));
    }
    window.addEventListener(NOTIFICATION_TOAST_EVENT, onNotif);
    return () => window.removeEventListener(NOTIFICATION_TOAST_EVENT, onNotif);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 4200);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[130] w-[92%] max-w-md -translate-x-1/2">
      <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/30 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur-md">
        <span className="mt-0.5 text-emerald-400" aria-hidden>
          🔔
        </span>
        <span className="line-clamp-2">{msg}</span>
      </div>
    </div>
  );
}
