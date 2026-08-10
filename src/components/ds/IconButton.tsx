import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TajButtonVariant } from "@/components/ds/types";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TajButtonVariant;
  label: string;
  children: ReactNode;
};

/** Square icon control — same variants as Button, icon size slot. */
export function IconButton({
  className,
  variant = "ghost",
  label,
  children,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn("taj-btn taj-btn--icon", `taj-btn--${variant}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
