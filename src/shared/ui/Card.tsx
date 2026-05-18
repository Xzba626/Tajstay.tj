import type { PropsWithChildren } from "react";
import clsx from "classnames";

type CardProps = PropsWithChildren<{
  className?: string;
  variant?: "default" | "glass";
}>;

export function Card({ children, className, variant = "glass" }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-4",
        variant === "glass"
          ? "surface-1 shadow-glass"
          : "border border-[var(--ds-border)] bg-[var(--ds-bg-section)] shadow-lg shadow-black/30 backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}
