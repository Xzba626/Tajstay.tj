"use client";

import { useEffect, useState } from "react";

type Stat = { value: number; suffix: string; label: string; decimals?: number };

function easeOutQuad(t: number) {
  return t * (2 - t);
}

function useCountUp(target: number, durationMs: number, active: boolean, decimals = 0) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutQuad(t);
      setDisplay(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, durationMs]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("ru-RU");

  return formatted;
}

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
  const num = useCountUp(stat.value, 1400, active, stat.decimals ?? 0);
  return (
    <div className="home-hero-stats__item">
      <div className="home-hero-stats__value">
        {num}
        {stat.suffix}
      </div>
      <div className="home-hero-stats__label">{stat.label}</div>
    </div>
  );
}

export function HomeHeroStats({ stats }: { stats: Stat[] }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="home-hero-stats" role="group" aria-label="Platform highlights">
      {stats.map((stat, i) => (
        <div key={stat.label} className="home-hero-stats__cell">
          {i > 0 ? <span className="home-hero-stats__divider" aria-hidden /> : null}
          <StatItem stat={stat} active={active} />
        </div>
      ))}
    </div>
  );
}
