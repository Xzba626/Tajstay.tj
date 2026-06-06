import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Gap = "xs" | "sm" | "md";

const gapClass: Record<Gap, string> = {
  xs: "gap-1.5",
  sm: "gap-2",
  md: "gap-3"
};

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  gap?: Gap;
  align?: "start" | "center" | "end";
  justify?: "start" | "between" | "end";
};

/** Horizontal flex-wrap layout — placement only. */
export function Cluster({
  children,
  gap = "sm",
  align = "start",
  justify = "start",
  className,
  ...props
}: Props) {
  const alignClass =
    align === "center" ? "items-center" : align === "end" ? "items-end" : "items-start";
  const justifyClass =
    justify === "between" ? "justify-between" : justify === "end" ? "justify-end" : "justify-start";

  return (
    <div className={cn("flex flex-wrap", gapClass[gap], alignClass, justifyClass, className)} {...props}>
      {children}
    </div>
  );
}
