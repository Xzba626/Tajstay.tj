import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { AppCard } from "@/components/ds/AppCard";

type Props = {
  title: string;
  description?: string;
  href?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function ActionCard({ title, description, href, icon, trailing, onClick, className }: Props) {
  const inner = (
    <>
      <div className="flex items-start gap-3">
        {icon ? (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--taj-lake-soft)] text-lg text-[var(--taj-lake)]"
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--taj-color-text)]">{title}</div>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--taj-color-text-secondary)]">{description}</p>
          ) : null}
        </div>
        {trailing ?? (
          <span className="shrink-0 text-[var(--taj-color-text-muted)]" aria-hidden>
            →
          </span>
        )}
      </div>
    </>
  );

  const cardClass = cn(
    "block transition hover:border-[var(--taj-lake)]/30 hover:bg-white/[0.07]",
    (href || onClick) && "cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        <AppCard variant="elevated" padding="md">
          {inner}
        </AppCard>
      </Link>
    );
  }

  return (
    <AppCard
      variant="elevated"
      padding="md"
      className={cardClass}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {inner}
    </AppCard>
  );
}
