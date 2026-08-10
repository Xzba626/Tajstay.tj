"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { TajikPattern } from "@/components/ds/TajikPattern";
import type { TajPatternKind } from "@/components/ds/TajikPattern";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
  /** One dominant motif for this section (Phase 5V). */
  motif?: TajPatternKind;
};

export function HomeSectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  children,
  motif = "divider"
}: Props) {
  return (
    <header
      className={cn(
        "home-section__header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "text-center sm:text-center sm:items-center",
        className
      )}
    >
      <div className={cn("min-w-0", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="home-section__eyebrow">{eyebrow}</p> : null}
        <h2 className="home-section__title">{title}</h2>
        <TajikPattern
          kind={motif}
          className={cn("heritage-section-motif", align === "center" && "heritage-section-motif--center")}
        />
        {description ? <p className={cn("home-section__desc", align === "center" && "mx-auto")}>{description}</p> : null}
        {children}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-semibold text-[var(--color-primary)] underline-offset-4 transition hover:text-[var(--color-primary-dark)] hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
