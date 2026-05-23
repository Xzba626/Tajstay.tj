"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeroTravelBackdrop } from "@/components/landing/HeroTravelBackdrop";

const DESTINATIONS = [
  { id: "dushanbe", label: "Душанбе", x: 52, y: 48 },
  { id: "khujand", label: "Худжанд", x: 38, y: 32 },
  { id: "panjakent", label: "Панҷакент", x: 44, y: 40 },
  { id: "pamir", label: "Памир", x: 68, y: 58 },
  { id: "iskanderkul", label: "Искандаркӯл", x: 58, y: 44 }
] as const;

type Props = {
  className?: string;
};

/** Hero preview — mountains, globe, routes, booking cards; no WebGL */
export function HeroTravelPreview({ className }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const tick = useCallback(() => {
    const c = currentRef.current;
    const t = targetRef.current;
    c.x += (t.x - c.x) * 0.08;
    c.y += (t.y - c.y) * 0.08;
    setOffset({ x: c.x, y: c.y });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, tick]);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRef.current = { x: nx * 6, y: ny * 5 };
    },
    [reducedMotion]
  );

  const onLeave = useCallback(() => {
    targetRef.current = { x: 0, y: 0 };
  }, []);

  return (
    <div
      ref={frameRef}
      className={`hero-travel-preview ${className ?? ""}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      aria-hidden
    >
      <HeroTravelBackdrop />

      <div
        className="hero-travel-preview__layer hero-travel-preview__globe"
        style={{ transform: `translate(${offset.x * 0.4}px, ${offset.y * 0.4}px)` }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <circle cx="100" cy="100" r="78" stroke="rgba(52, 211, 153, 0.22)" strokeWidth="1.5" />
          <ellipse cx="100" cy="100" rx="78" ry="28" stroke="rgba(52, 211, 153, 0.12)" strokeWidth="1" />
          <ellipse cx="100" cy="100" rx="28" ry="78" stroke="rgba(52, 211, 153, 0.12)" strokeWidth="1" />
          <path
            d="M28 100 Q55 72 100 68 Q145 64 172 100 Q145 128 100 132 Q55 136 28 100"
            stroke="rgba(34, 197, 94, 0.25)"
            strokeWidth="1.2"
            fill="rgba(16, 185, 129, 0.06)"
          />
          <path
            className="hero-travel-preview__route"
            d="M38 88 Q72 62 100 58 Q128 54 162 72"
            stroke="url(#routeGrad)"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />
          <path
            className="hero-travel-preview__route"
            d="M48 108 Q88 92 118 96 Q148 100 168 88"
            stroke="url(#routeGrad2)"
            strokeWidth="1.5"
            strokeDasharray="4 10"
            strokeLinecap="round"
            opacity="0.7"
          />
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d4b87a" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="routeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {DESTINATIONS.map((d) => (
            <g key={d.id} transform={`translate(${d.x * 2}, ${d.y * 2})`}>
              <circle r="4" fill="#4ade80" />
              <circle r="8" fill="#22c55e" className="hero-travel-preview__pulse" />
            </g>
          ))}
        </svg>
      </div>

      <div
        className="hero-travel-preview__float hero-travel-preview__float--verified"
        style={{ transform: `translate(${offset.x * 0.2}px, ${offset.y * 0.15}px)` }}
      >
        <span className="hero-travel-preview__float-icon">✓</span>
        <div>
          <div className="hero-travel-preview__float-title">Проверено</div>
          <div className="hero-travel-preview__float-text">Искандаркӯл · дом</div>
        </div>
      </div>

      <div
        className="hero-travel-preview__card"
        style={{ transform: `translate(${offset.x * 0.15}px, ${offset.y * 0.12}px)` }}
      >
        <div className="hero-travel-preview__card-badge">TJ-4821</div>
        <div className="hero-travel-preview__card-title">Горный домик · Памир</div>
        <div className="hero-travel-preview__card-meta">12–15 июн · 2 гостя</div>
        <div className="hero-travel-preview__card-row">
          <span className="hero-travel-preview__card-price">486 TJS</span>
          <span className="hero-travel-preview__card-status">Подтверждено</span>
        </div>
      </div>

      <div className="hero-travel-preview__chips">
        {DESTINATIONS.slice(0, 4).map((d) => (
          <span key={d.id} className="hero-travel-preview__chip">
            {d.label}
          </span>
        ))}
      </div>

      <div className="hero-travel-preview__trust">
        <span>✓ Проверенные объекты</span>
        <span>✓ Безопасное бронирование</span>
      </div>
    </div>
  );
}
