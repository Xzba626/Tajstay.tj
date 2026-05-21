import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Cols = 1 | 2 | 3 | 4 | "auto";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  cols?: Cols;
  gap?: "sm" | "md" | "lg";
};

const colClass: Record<Cols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  auto: "grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]"
};

const gapClass = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6"
};

export function ContentGrid({ children, cols = 2, gap = "md", className, ...props }: Props) {
  return (
    <div className={cn("taj-content-grid grid", colClass[cols], gapClass[gap], className)} {...props}>
      {children}
    </div>
  );
}
