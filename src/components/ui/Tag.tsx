import type { PropsWithChildren } from "react";
import clsx from "classnames";

type Props = PropsWithChildren<{
  active?: boolean;
  className?: string;
}>;

export function Tag({ children, active, className }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition",
        active
          ? "border-[var(--ds-border)] bg-[rgba(20,92,67,0.28)] text-[var(--ds-text-primary)]"
          : "border-[var(--ds-border)] bg-[rgba(15,31,26,0.7)] text-[var(--ds-text-secondary)]",
        className
      )}
    >
      {children}
    </span>
  );
}
