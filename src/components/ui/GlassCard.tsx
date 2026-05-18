import type { PropsWithChildren } from "react";
import clsx from "classnames";

type Props = PropsWithChildren<{
  accent?: boolean;
  className?: string;
}>;

export function GlassCard({ children, accent = false, className }: Props) {
  return <div className={clsx(accent ? "liquid-glass" : "quiet-card", "rounded-[20px]", className)}>{children}</div>;
}
