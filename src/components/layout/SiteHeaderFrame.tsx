"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
};

/** Mobile: hide header on scroll down, show on scroll up. */
export function SiteHeaderFrame({ children }: Props) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");

    function update() {
      ticking.current = false;
      if (!mq.matches) {
        setHidden(false);
        return;
      }
      const y = window.scrollY;
      if (y <= 8) {
        setHidden(false);
        lastY.current = y;
        return;
      }
      const delta = y - lastY.current;
      if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY.current = y;
    }

    function onScroll() {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    }

    function onMqChange() {
      if (!mq.matches) setHidden(false);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onMqChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMqChange);
    };
  }, []);

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-[100] transition-[background-color,transform] duration-300",
        hidden && "site-header--scroll-hidden"
      )}
    >
      {children}
    </header>
  );
}
