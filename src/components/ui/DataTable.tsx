"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DataTable({
  header,
  children,
  className
}: {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm", className)}>
      {header ? <div className="border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{header}</div> : null}
      <div className="divide-y divide-white/10">{children}</div>
    </div>
  );
}

