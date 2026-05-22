import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TajButtonSize, TajButtonVariant } from "@/components/ds/types";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TajButtonVariant;
  size?: TajButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
};

function variantClass(v: TajButtonVariant) {
  return `taj-btn--${v}`;
}

function sizeClass(s: TajButtonSize) {
  if (s === "sm") return "taj-btn--sm";
  if (s === "lg") return "taj-btn--lg";
  return "";
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "taj-btn",
        variantClass(variant),
        sizeClass(size),
        fullWidth && "taj-btn--full",
        loading && "is-loading",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      {...props}
    >
      {loading ? <span className="sr-only">Loading</span> : children}
    </button>
  );
}
