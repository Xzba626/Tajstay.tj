import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({ title, description, actions, children, className }: Props) {
  return (
    <section className={cn("taj-dashboard-section mb-[var(--taj-section-gap)]", className)}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--taj-color-border)] pb-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--taj-color-text)] sm:text-2xl">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--taj-color-text-secondary)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
