import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppCard } from "@/components/ds/AppCard";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  align?: "center" | "start";
  className?: string;
};

export function EmptyStateCard({ title, description, icon, actions, align = "center", className }: Props) {
  return (
    <AppCard
      variant="outline"
      padding="lg"
      className={cn(
        "relative overflow-hidden",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {icon ? (
        <div className={cn("mb-4 text-2xl", align === "center" && "flex justify-center")} aria-hidden>
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-[var(--taj-color-text)] sm:text-xl">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--taj-color-text-secondary)]">{description}</p>
      ) : null}
      {actions ? (
        <div className={cn("mt-6 flex flex-wrap gap-3", align === "center" && "justify-center")}>{actions}</div>
      ) : null}
    </AppCard>
  );
}
