"use client";

import { useEffect, useRef } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function AmbientGreenBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (prefersReducedMotion()) return;

    const onResize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * ratio));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    onResize();
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const x1 = w * (0.18 + Math.sin(t * 0.002) * 0.04);
      const y1 = h * (0.22 + Math.cos(t * 0.0016) * 0.05);
      const x2 = w * (0.82 + Math.cos(t * 0.0017) * 0.05);
      const y2 = h * (0.18 + Math.sin(t * 0.0019) * 0.04);

      const g1 = ctx.createRadialGradient(x1, y1, 20, x1, y1, Math.max(w, h) * 0.9);
      g1.addColorStop(0, "rgba(34,197,94,0.16)");
      g1.addColorStop(0.35, "rgba(15,118,110,0.10)");
      g1.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(x2, y2, 30, x2, y2, Math.max(w, h) * 0.85);
      g2.addColorStop(0, "rgba(16,185,129,0.12)");
      g2.addColorStop(0.45, "rgba(34,197,94,0.08)");
      g2.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full opacity-90"
    />
  );
}

