"use client";

import { useEffect, useState } from "react";

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
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 3200);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[60] w-[92%] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur-md">
        {msg}
      </div>
    </div>
  );
}

