"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Hero3DLazy = dynamic(
  () => import("./Hero3DScene").then((mod) => ({ default: mod.Hero3DScene })),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 animate-pulse rounded-[2rem] bg-gradient-to-br from-emerald-950/30 via-slate-900/20 to-cyan-950/25"
        aria-hidden
      />
    )
  }
);

type Props = { className?: string };

/**
 * Three.js (~сотни KB gzip) не грузим на телефонах и узких каналах (Cloudflare Tunnel):
 * компонент монтируется только при md+ и без prefers-reduced-motion.
 */
export function Hero3DSceneGate({ className }: Props) {
  const [mount3d, setMount3d] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMount3d(mq.matches && !motion.matches);
    };
    update();
    mq.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  if (!mount3d) return null;
  return <Hero3DLazy className={className} />;
}
