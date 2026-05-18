"use client";

import { useEffect } from "react";

/** Enables gentle scroll-snap between home “chapters” (respects reduced-motion). */
export function HomeScrollEnhancer() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!reduced && isDesktop) {
      root.classList.add("home-page-snap");
    }
    return () => {
      root.classList.remove("home-page-snap");
    };
  }, []);
  return null;
}
