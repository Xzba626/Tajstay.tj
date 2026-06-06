import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FilterChipTone = "primary" | "accent";

type Props = {
  href: string;
  active?: boolean;
  tone?: FilterChipTone;
  children: ReactNode;
};

const toneActive: Record<FilterChipTone, string> = {
  primary: "taj-filter-chip--active-primary",
  accent: "taj-filter-chip--active-accent"
};

export function FilterChip({ href, active = false, tone = "primary", children }: Props) {
  return (
    <Link
      href={href}
      className={cn("taj-filter-chip", active && toneActive[tone])}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
