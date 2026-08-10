import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

/** Thin rule between grouped menu / section blocks. */
export function Separator({ orientation = "horizontal", className, ...props }: Props) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "taj-separator taj-separator--horizontal" : "taj-separator taj-separator--vertical",
        className
      )}
      {...props}
    />
  );
}
