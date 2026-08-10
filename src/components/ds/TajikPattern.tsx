"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

/** Canonical Heritage pattern family (Phase 5F). */
export type TajPatternKind =
  | "main"
  | "chakan"
  | "crown"
  | "pamir"
  | "dushanbe"
  | "divider"
  | "corner"
  | "micro";

/** @deprecated Prefer TajPatternKind. Kept for EmptyState / legacy call sites. */
export type TajikPatternVariant = TajPatternKind | "subtle" | "footer";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: TajikPatternVariant;
  /** Alias of variant — preferred API name. */
  kind?: TajPatternKind;
};

function resolveKind(kind?: TajPatternKind, variant?: TajikPatternVariant): TajPatternKind {
  const raw = kind ?? variant ?? "main";
  if (raw === "subtle" || raw === "footer") return "main";
  return raw;
}

function MotifDefs({ id, kind }: { id: string; kind: TajPatternKind }): ReactNode {
  switch (kind) {
    case "divider":
      return (
        <pattern id={id} width="48" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 7 H18" fill="none" stroke="currentColor" strokeWidth="0.85" />
          <path d="M24 7 H48" fill="none" stroke="currentColor" strokeWidth="0.85" />
          <path d="M20 7 L24 3 L28 7 L24 11 Z" fill="none" stroke="currentColor" strokeWidth="0.85" />
          <circle cx="24" cy="7" r="1.1" fill="currentColor" opacity="0.65" />
        </pattern>
      );
    case "pamir":
      return (
        <pattern id={id} width="120" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M0 28 L18 14 L32 22 L52 6 L72 20 L90 10 L110 18 L120 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M0 30 L22 20 L40 26 L60 14 L80 24 L100 16 L120 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.45"
          />
        </pattern>
      );
    case "chakan":
      return (
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <path
            d="M28 10 C22 16 18 22 28 28 C38 22 34 16 28 10 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M28 28 C22 34 18 40 28 46 C38 40 34 34 28 28 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path d="M10 28 H46" fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.5" />
          <circle cx="28" cy="28" r="1.4" fill="currentColor" opacity="0.55" />
        </pattern>
      );
    case "dushanbe":
      return (
        <pattern id={id} width="64" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M8 40 V18 Q32 4 56 18 V40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path d="M28 28 L32 22 L36 28 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
          <path d="M12 40 H52" fill="none" stroke="currentColor" strokeWidth="0.75" />
        </pattern>
      );
    case "main":
    default:
      return (
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 4 L28 12 L20 20 L12 12 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M20 10 L24 14 L20 18 L16 14 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="20" cy="14" r="1.15" fill="currentColor" opacity="0.45" />
          <path d="M4 28 L8 24 L12 28 L8 32 Z" fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.35" />
        </pattern>
      );
  }
}

function StandaloneMotif({ kind }: { kind: "crown" | "corner" | "micro" }) {
  if (kind === "crown") {
    return (
      <svg className="tajik-pattern__svg" viewBox="0 0 56 36" fill="none" aria-hidden>
        <path d="M8 28 L14 12 L22 22 L28 8 L34 22 L42 12 L48 28 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M10 28 H46" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="28" cy="6" r="1.6" fill="currentColor" />
        <circle cx="14" cy="12" r="1.1" fill="currentColor" opacity="0.7" />
        <circle cx="42" cy="12" r="1.1" fill="currentColor" opacity="0.7" />
      </svg>
    );
  }
  if (kind === "corner") {
    return (
      <svg className="tajik-pattern__svg" viewBox="0 0 44 44" fill="none" aria-hidden>
        <path d="M4 4 H28" stroke="currentColor" strokeWidth="1.1" />
        <path d="M4 4 V28" stroke="currentColor" strokeWidth="1.1" />
        <path d="M10 10 L16 4 L22 10 L16 16 Z" stroke="currentColor" strokeWidth="0.9" />
        <circle cx="16" cy="10" r="1.2" fill="currentColor" opacity="0.6" />
      </svg>
    );
  }
  return (
    <svg className="tajik-pattern__svg" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2 L14 10 L10 18 L6 10 Z" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="10" cy="10" r="1.15" fill="currentColor" />
    </svg>
  );
}

/**
 * Geometric Tajik-inspired signature motifs.
 * Use at most one dominant kind per screen; max 1–2 strong moments per viewport.
 * Never as a dense full-page wallpaper.
 */
export function TajikPattern({ variant = "main", kind, className, ...props }: Props) {
  const uid = useId().replace(/:/g, "");
  const resolved = resolveKind(kind, variant);
  const patternId = `taj-heritage-${resolved}-${uid}`;
  const legacyClass =
    variant === "subtle" ? "tajik-pattern--subtle" : variant === "footer" ? "tajik-pattern--footer" : null;

  if (resolved === "crown" || resolved === "corner" || resolved === "micro") {
    return (
      <div
        aria-hidden
        className={cn("tajik-pattern", `tajik-pattern--${resolved}`, legacyClass, className)}
        {...props}
      >
        <StandaloneMotif kind={resolved} />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn("tajik-pattern", `tajik-pattern--${resolved}`, legacyClass, className)}
      {...props}
    >
      <svg className="tajik-pattern__svg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden>
        <defs>
          <MotifDefs id={patternId} kind={resolved} />
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

/** Preferred export alias. */
export const TajPattern = TajikPattern;
