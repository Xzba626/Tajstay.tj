import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppCard } from "@/components/ds/AppCard";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, hint, trend, className }: Props) {
  return (
    <AppCard variant="elevated" padding="md" className={cn("flex flex-col", className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--taj-color-text-muted)]">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold tabular-nums text-[var(--taj-color-text)]">{value}</div>
        {trend ? <div className="text-xs text-[var(--taj-color-text-secondary)]">{trend}</div> : null}
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-[var(--taj-color-text-muted)]">{hint}</p> : null}
    </AppCard>
  );
}
