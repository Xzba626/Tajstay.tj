"use client";

import type { CSSProperties } from "react";

/** Lightweight CSS bokeh layer — no canvas, GPU-friendly. */
export function HomeHeroParticles() {
  return (
    <div className="home-hero-particles" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} className="home-hero-particles__dot" style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}
