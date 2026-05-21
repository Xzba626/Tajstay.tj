import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StickyActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("taj-sticky-actions", className)}>{children}</div>;
}
