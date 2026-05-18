"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tajstay_splash_seen";
const SHOW_MS = 900;
const FADE_START_MS = 450;

type Props = { subtitle: string };

export function SplashScreenClient({ subtitle }: Props) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (isMobile || saveData) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }
    setVisible(true);
    const fadeTimer = window.setTimeout(() => setFadeOut(true), FADE_START_MS);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, SHOW_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 ${fadeOut ? "taj-splash-out" : ""}`}
      aria-hidden
    >
      <div className={fadeOut ? "taj-splash-logo-out flex flex-col items-center gap-6" : "animate-splash-in flex flex-col items-center gap-6"}>
        <Image
          src="/logo-main.png"
          alt="TajStay"
          width={220}
          height={220}
          className="h-auto w-44 rounded-xl drop-shadow-2xl"
          priority
          unoptimized
        />
        <div className="text-center">
          <div className="mt-1 text-sm text-green-100/90">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
