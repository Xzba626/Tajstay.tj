"use client";

import { usePathname } from "next/navigation";

/** Decorative canvas disabled — product canvas is white. */
export function PageBackdrop() {
  usePathname();
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-30 bg-white" />;
}
