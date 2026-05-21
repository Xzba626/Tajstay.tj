import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { TajInputProps } from "@/components/ds/types";

export function Input({ className, hasError, inputSize = "md", tone = "dashboard", ...props }: TajInputProps) {
  return (
    <input
      className={cn(
        "taj-input",
        inputSize === "lg" && "min-h-[var(--taj-control-h-lg)] text-base",
        tone === "public" && "taj-input--public",
        hasError && "taj-input--error",
        className
      )}
      {...props}
    />
  );
}

export type TextareaProps = InputHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
  tone?: "dashboard" | "public";
};

export function Textarea({ className, hasError, tone = "dashboard", ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "taj-input min-h-[6rem] resize-y py-3",
        tone === "public" && "taj-input--public",
        hasError && "taj-input--error",
        className
      )}
      {...props}
    />
  );
}
