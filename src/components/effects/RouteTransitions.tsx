"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteTransitions() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (prev.current === null) {
      prev.current = pathname;
      return;
    }
    if (prev.current === pathname) return;

    prev.current = pathname;
    setActive(true);
    const t = window.setTimeout(() => setActive(false), mobile ? 220 : 420);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-30 transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity] md:z-50 ${
        active ? "opacity-100 md:backdrop-blur-[6px]" : "opacity-0 backdrop-blur-none"
      }`}
      style={{
        background:
          "radial-gradient(900px 520px at 18% 8%, rgba(16,185,129,0.14), transparent 62%), radial-gradient(900px 560px at 82% 12%, rgba(20,184,166,0.12), transparent 68%), radial-gradient(800px 480px at 50% 100%, rgba(14,165,233,0.06), transparent 70%)"
      }}
    />
  );
}
