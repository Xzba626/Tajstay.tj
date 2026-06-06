import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Gap = "xs" | "sm" | "md" | "lg";

const gapClass: Record<Gap, string> = {
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6"
};

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  gap?: Gap;
};

/** Vertical layout rhythm — spacing only, no visual skin. */
export function Stack({ children, gap = "md", className, ...props }: Props) {
  return (
    <div className={cn("flex flex-col", gapClass[gap], className)} {...props}>
      {children}
    </div>
  );
}
