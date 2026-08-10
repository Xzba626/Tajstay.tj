"use client";

import type { HTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export type TajikPatternVariant = "subtle" | "divider" | "footer";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: TajikPatternVariant;
};

/**
 * Geometric Tajik-inspired signature. Use at most 1–2 instances per viewport.
 * SVG pattern — no heavy raster textures.
 */
export function TajikPattern({ variant = "subtle", className, ...props }: Props) {
  const uid = useId().replace(/:/g, "");
  const patternId = `tajik-geo-${variant}-${uid}`;

  return (
    <div aria-hidden className={cn("tajik-pattern", `tajik-pattern--${variant}`, className)} {...props}>
      <svg className="tajik-pattern__svg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden>
        <defs>
          <pattern
            id={patternId}
            width={variant === "divider" ? 24 : 40}
            height={variant === "divider" ? 12 : 40}
            patternUnits="userSpaceOnUse"
          >
            {variant === "divider" ? (
              <>
                <path d="M0 6 H24" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.55" />
                <path d="M6 6 L12 2 L18 6 L12 10 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
              </>
            ) : (
              <>
                <path d="M20 4 L28 12 L20 20 L12 12 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M20 10 L24 14 L20 18 L16 14 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
                <circle cx="20" cy="14" r="1.25" fill="currentColor" opacity="0.5" />
              </>
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
