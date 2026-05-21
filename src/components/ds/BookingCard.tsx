import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppCard } from "@/components/ds/AppCard";

export type BookingStatusTone = "pending" | "confirmed" | "cancelled" | "completed" | "default";

const toneClass: Record<BookingStatusTone, string> = {
  pending: "bg-amber-500/15 text-amber-200 border-amber-400/25",
  confirmed: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
  cancelled: "bg-red-500/15 text-red-200 border-red-400/25",
  completed: "bg-slate-500/15 text-slate-200 border-slate-400/25",
  default: "bg-white/10 text-slate-200 border-white/15"
};

type Props = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusTone?: BookingStatusTone;
  meta?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
};

export function BookingCard({
  title,
  subtitle,
  statusLabel,
  statusTone = "default",
  meta,
  primaryAction,
  secondaryActions,
  className
}: Props) {
  return (
    <AppCard variant="elevated" padding="md" className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[var(--taj-color-text)]">{title}</h3>
          {statusLabel ? (
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", toneClass[statusTone])}>
              {statusLabel}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-[var(--taj-color-text-secondary)]">{subtitle}</p> : null}
        {meta ? <div className="mt-2 text-sm text-[var(--taj-color-text-muted)]">{meta}</div> : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        {primaryAction}
        {secondaryActions ? <div className="flex flex-wrap gap-2">{secondaryActions}</div> : null}
      </div>
    </AppCard>
  );
}
