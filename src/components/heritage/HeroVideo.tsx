"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { HeroVideoSources } from "@/lib/heritage/heroVideo";

type Props = {
  sources: HeroVideoSources;
  className?: string;
  /** Intrinsic aspect / min height for layout reservation. */
  contentClassName?: string;
  children?: ReactNode;
  /** Accessible label for the decorative media region. */
  label?: string;
};

/**
 * Cinematic Tajikistan landscape shell: muted seamless loop when sources exist,
 * poster fallback otherwise. Respects prefers-reduced-motion.
 * Phase 5F infrastructure — wire into Home in Phase 5a only.
 */
export function HeroVideo({ sources, className, contentClassName, children, label = "Tajikistan landscape" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduceMotion || !sources.enabled || failed) return;
    const play = () => {
      void el.play().catch(() => setFailed(true));
    };
    play();
  }, [sources.enabled, reduceMotion, failed, sources.mp4, sources.webm]);

  const showVideo = sources.enabled && !reduceMotion && !failed;

  return (
    <section
      className={cn("heritage-hero-video", className)}
      aria-label={label}
      data-heritage-motif="pamir"
      data-hero-video={showVideo ? "playing" : "poster"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- poster may be SVG or remote CDN */}
      <img
        className="heritage-hero-video__poster"
        src={sources.poster}
        alt=""
        aria-hidden
        decoding="async"
      />
      {showVideo ? (
        <video
          ref={videoRef}
          className="heritage-hero-video__media"
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
          poster={sources.poster}
          onError={() => setFailed(true)}
        >
          {sources.webm ? <source src={sources.webm} type="video/webm" /> : null}
          {sources.mp4 ? <source src={sources.mp4} type="video/mp4" /> : null}
        </video>
      ) : null}
      <div className="heritage-hero-video__scrim" aria-hidden />
      {children ? <div className={cn("heritage-hero-video__content", contentClassName)}>{children}</div> : null}
    </section>
  );
}
