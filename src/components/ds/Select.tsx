import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
  tone?: "dashboard" | "public";
};

/** Native select styled to match Input (taj-input tokens). */
export function Select({ className, hasError, tone = "dashboard", children, ...props }: Props) {
  return (
    <select
      className={cn(
        "taj-input taj-select",
        tone === "public" && "taj-input--public",
        hasError && "taj-input--error",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
