"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

type BackgroundVariant = "mountains" | "grid" | "aurora" | "particles" | "subtle" | "default";

function variantForPath(pathname: string): BackgroundVariant {
  if (pathname === "/") return "mountains";
  if (pathname.startsWith("/search")) return "grid";
  if (pathname.startsWith("/hotel")) return "aurora";
  if (pathname.startsWith("/auth")) return "particles";
  if (pathname.startsWith("/dashboard")) return "subtle";
  return "default";
}

export function PageBackdrop() {
  const pathname = usePathname() ?? "/";
  const variant = useMemo(() => variantForPath(pathname), [pathname]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const particles = Array.from({ length: 40 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      v: 0.00035 + Math.random() * 0.00045
    }));
    let raf = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    };
    resize();

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const time = t * 0.001;

      ctx.clearRect(0, 0, w, h);
      /* Soft canvas — UI backdrop (not brand logo). Canonical soft bg. */
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, w, h);

      if (variant === "subtle" || variant === "default") return;

      if (variant === "mountains") {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#E6F5F0");
        grad.addColorStop(0.55, "#F8FAFC");
        grad.addColorStop(1, "#EEF2F7");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let layer = 0; layer < 3; layer++) {
          const yBase = h * (0.58 + layer * 0.1);
          const amp = h * (0.06 - layer * 0.012);
          const speed = 0.12 + layer * 0.08;
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 12) {
            const y = yBase + Math.sin((x / w) * Math.PI * 4 + time * speed) * amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fillStyle = `rgba(8,127,91,${0.08 - layer * 0.02})`;
          ctx.fill();
        }
      } else if (variant === "grid") {
        ctx.strokeStyle = "rgba(52,211,153,0.14)";
        ctx.lineWidth = 1 * dpr;
        const step = Math.max(36 * dpr, 22);
        for (let y = h * 0.45; y < h; y += step) {
          const p = (y - h * 0.45) / (h * 0.55);
          const left = w * (0.05 + p * 0.22);
          const right = w * (0.95 - p * 0.22);
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
        }
        for (let i = 0; i <= 14; i++) {
          const x = (i / 14) * w;
          ctx.beginPath();
          ctx.moveTo(x, h);
          ctx.lineTo(w * 0.5, h * 0.45);
          ctx.stroke();
        }
      } else if (variant === "aurora") {
        for (let i = 0; i < 4; i++) {
          const waveY = h * (0.06 + i * 0.09);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 10) {
            const y = waveY + Math.sin(x * 0.01 + time * (0.5 + i * 0.15)) * (12 + i * 4) * dpr;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(52,211,153,${0.12 - i * 0.018})`;
          ctx.lineWidth = (18 - i * 3) * dpr;
          ctx.stroke();
        }
      } else if (variant === "particles") {
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(0, 0, w, h);

        for (const p of particles) {
          p.y -= p.v;
          if (p.y < -0.05) {
            p.y = 1.05;
            p.x = Math.random();
          }
          const px = p.x * w;
          const py = p.y * h;
          ctx.beginPath();
          ctx.arc(px, py, 2.2 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(8,127,91,0.35)";
          ctx.fill();
        }
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = (particles[i].x - particles[j].x) * w;
            const dy = (particles[i].y - particles[j].y) * h;
            const dist = Math.hypot(dx, dy);
            if (dist < 120 * dpr) {
              ctx.strokeStyle = `rgba(52,211,153,${0.28 * (1 - dist / (120 * dpr))})`;
              ctx.lineWidth = 1 * dpr;
              ctx.beginPath();
              ctx.moveTo(particles[i].x * w, particles[i].y * h);
              ctx.lineTo(particles[j].x * w, particles[j].y * h);
              ctx.stroke();
            }
          }
        }
      }
      raf = window.requestAnimationFrame(draw);
    };

    if (variant === "grid" || variant === "subtle" || variant === "default") {
      draw(0);
    } else {
      raf = window.requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [variant]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-30">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className={`page-backdrop page-backdrop--${variant}`} />
      <div className="page-vignette" />
    </div>
  );
}

