"use client";

import { useEffect, useRef } from "react";

const REPORT_INTERVAL_MS = 30 * 60 * 1000;

function collectClientHints() {
  if (typeof window === "undefined") return null;
  return {
    systemLanguage: navigator.language || null,
    screenWidth: window.screen?.width ?? null,
    screenHeight: window.screen?.height ?? null
  };
}

/** Sends client device hints; server enriches with IP, geo, and User-Agent. */
export function DeviceSessionReporter() {
  const lastSent = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function report() {
      const hints = collectClientHints();
      if (!hints || cancelled) return;

      const now = Date.now();
      if (now - lastSent.current < REPORT_INTERVAL_MS && lastSent.current > 0) return;

      try {
        const res = await fetch("/api/user/device-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify(hints)
        });
        if (res.ok) lastSent.current = now;
      } catch {
        /* best-effort */
      }
    }

    void report();

    const onVisible = () => {
      if (document.visibilityState === "visible") void report();
    };

    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void report(), REPORT_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
