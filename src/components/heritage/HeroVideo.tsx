"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { HeroVideoSources } from "@/lib/heritage/heroVideo";

type Props = {
  sources: HeroVideoSources;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
  label?: string;
  /** Full-bleed under Home hero (no card chrome). */
  variant?: "framed" | "bleed";
  /** Mobile / tablet: poster only (save bandwidth). Desktop plays when sources.enabled. */
  preferPosterOnMobile?: boolean;
};

/**
 * Cinematic Tajikistan landscape: muted seamless loop when sources exist.
 * Never autoplays with sound. Mobile defaults to poster when preferPosterOnMobile.
 */
export function HeroVideo({
  sources,
  className,
  contentClassName,
  children,
  label = "Tajikistan landscape",
  variant = "framed",
  preferPosterOnMobile = true
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      setReduceMotion(motion.matches);
      setIsNarrow(narrow.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
    };
  }, []);

  const allowVideo =
    sources.enabled && !reduceMotion && !failed && !(preferPosterOnMobile && isNarrow);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !allowVideo) return;
    void el.play().catch(() => setFailed(true));
  }, [allowVideo, sources.mp4, sources.webm]);

  return (
    <section
      className={cn(
        "heritage-hero-video",
        variant === "bleed" && "heritage-hero-video--bleed",
        className
      )}
      aria-label={label}
      data-heritage-motif="pamir"
      data-hero-video={allowVideo ? "playing" : "poster"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- poster may be SVG or remote CDN */}
      <img
        className="heritage-hero-video__poster"
        src={sources.poster}
        alt=""
        aria-hidden
        decoding="async"
      />
      {allowVideo ? (
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
