import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import clsx from "classnames";

type Variant = "primary" | "secondary" | "ghost" | "glass" | "danger";

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    fullWidth?: boolean;
    loading?: boolean;
  }
>;

export function Button({ children, className, variant = "primary", fullWidth, loading, disabled, ...props }: Props) {
  const base =
    "h-12 rounded-2xl px-6 text-sm font-semibold transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-60";
  const byVariant: Record<Variant, string> = {
    primary:
      "border border-[color:color-mix(in_srgb,var(--ds-secondary)_68%,white_32%)] bg-[var(--ds-secondary)] text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.28),0_0_22px_rgba(0,255,150,0.15)] hover:brightness-110 active:scale-[0.985]",
    secondary: "border border-[var(--ds-border)] bg-transparent text-[var(--ds-text-secondary)] hover:bg-[rgba(20,92,67,0.22)]",
    ghost: "bg-transparent text-[var(--ds-text-secondary)] hover:bg-[rgba(20,92,67,0.14)]",
    glass: "surface-1 text-[var(--ds-text-primary)] hover:brightness-110",
    danger: "border border-red-400/35 bg-red-500/20 text-white hover:bg-red-500/30"
  };

  return (
    <button
      className={clsx(base, byVariant[variant], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "..." : children}
    </button>
  );
}
