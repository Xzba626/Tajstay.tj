"use client";

import Image from "next/image";
import { Building2, KeyRound, Map, Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

const STORAGE_KEY = "tajstay_splash_seen";
const SHOW_MS = 2400;
const FADE_START_MS = 1900;

type Phase = "plane" | "icons" | "logo";

type Props = { subtitle: string };

export function SplashScreenClient({ subtitle }: Props) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [phase, setPhase] = useState<Phase>("plane");

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
    const phaseIcons = window.setTimeout(() => setPhase("icons"), 620);
    const phaseLogo = window.setTimeout(() => setPhase("logo"), 1180);
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
      window.clearTimeout(phaseIcons);
      window.clearTimeout(phaseLogo);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`taj-splash fixed inset-0 z-[200] flex flex-col items-center justify-center ${fadeOut ? "taj-splash-out" : ""}`}
      aria-hidden
    >
      <div className={fadeOut ? "taj-splash-logo-out" : ""}>
        <div className="taj-splash__stage">
          {phase === "plane" ? (
            <Plane className="taj-splash__plane" size={44} strokeWidth={1.75} aria-hidden />
          ) : null}
          {phase === "icons" ? (
            <div className="taj-splash__icons" aria-hidden>
              <span className="taj-splash__icon">
                <Building2 size={26} strokeWidth={1.75} />
              </span>
              <span className="taj-splash__icon">
                <Map size={26} strokeWidth={1.75} />
              </span>
              <span className="taj-splash__icon">
                <KeyRound size={26} strokeWidth={1.75} />
              </span>
            </div>
          ) : null}
          {phase === "logo" ? (
            <div className="taj-splash__logo-wrap">
              <div className="taj-splash__logo-glow">
                <Image
                  src={BRAND.logoFull}
                  alt={BRAND.name}
                  width={280}
                  height={280}
                  className="h-auto w-52 max-w-[min(280px,80vw)] object-contain"
                  priority
                  unoptimized
                />
              </div>
              <p className="taj-splash__subtitle">{subtitle}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
