"use client";

import { usePathname } from "next/navigation";

/** Decorative canvas disabled — product canvas follows the active theme, not a fixed white. */
export function PageBackdrop() {
  usePathname();
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-30 bg-[var(--ts-surface-page,#ffffff)]"
    />
  );
}
