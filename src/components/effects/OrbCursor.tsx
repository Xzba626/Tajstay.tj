"use client";

import { useEffect, useRef } from "react";

export function OrbCursor() {
  const orbRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const orb = orbRef.current;
    if (!orb || window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    let raf = 0;
    const animate = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      orb.style.transform = `translate3d(${currentX - 120}px, ${currentY - 120}px, 0)`;
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={orbRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-10 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.24)_0%,rgba(15,118,110,0.18)_35%,rgba(2,6,23,0)_72%)] blur-2xl"
    />
  );
}
