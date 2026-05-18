import type { InputHTMLAttributes } from "react";
import clsx from "classnames";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export function Input({ className, hasError, ...props }: Props) {
  return (
    <input
      className={clsx(
        "ds-input w-full text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]",
        hasError && "border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]",
        className
      )}
      {...props}
    />
  );
}
