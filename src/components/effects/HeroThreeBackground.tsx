"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** Merged onto the canvas (positioning, opacity, etc.). */
  className?: string;
};

export function HeroThreeBackground({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const pointer = { x: 0.5, y: 0.5 };
    const nodeCount = isMobile ? 8 : 22;
    const nodes = Array.from({ length: nodeCount }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.2 + 0.8,
      speed: Math.random() * 0.00045 + 0.00025
    }));

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.y = (event.clientY - rect.top) / Math.max(rect.height, 1);
    };
    if (!isMobile) {
      window.addEventListener("mousemove", onMouseMove);
    }

    const onResize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    onResize();
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = window.requestAnimationFrame(animate);
      t += 1;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(w * pointer.x, h * pointer.y, 20, w * 0.5, h * 0.5, Math.max(w, h));
      grad.addColorStop(0, "rgba(34,197,94,0.18)");
      grad.addColorStop(0.45, "rgba(74,222,128,0.1)");
      grad.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      nodes.forEach((node, i) => {
        node.y += node.speed;
        if (node.y > 1.05) node.y = -0.05;
        const x = node.x * w + Math.sin((t + i * 17) * 0.006) * 8;
        const y = node.y * h;
        const glow = 8 + node.size * 3;
        ctx.beginPath();
        ctx.fillStyle = "rgba(74,222,128,0.45)";
        ctx.arc(x, y, node.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(34,197,94,0.12)";
        ctx.arc(x, y, glow, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (!isMobile) window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      className={cn("pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-45 sm:opacity-50", className)}
      ref={canvasRef}
      aria-hidden
    />
  );
}
