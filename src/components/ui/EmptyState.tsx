"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center",
        className
      )}
    >
      <div className="text-lg font-semibold text-slate-100">{title}</div>
      {description ? <div className="mt-2 text-sm text-slate-300">{description}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

