import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
};

export function FormSection({ title, description, children, className, aside }: Props) {
  return (
    <section className={cn("taj-form-section", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--taj-color-border)] pb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-300/90">{title}</h3>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--taj-color-text-secondary)]">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function FormField({
  id,
  label,
  required,
  optionalLabel,
  error,
  description,
  className,
  children,
  fullWidth
}: {
  id: string;
  label: string;
  required?: boolean;
  optionalLabel?: string;
  error?: string;
  description?: string;
  className?: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(fullWidth !== false && "sm:col-span-2", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-[var(--taj-color-text)]">
          {label}
        </label>
        {optionalLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--taj-color-text-muted)]">
            {optionalLabel}
          </span>
        ) : null}
        {required && !optionalLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400/80">*</span>
        ) : null}
      </div>
      {description ? <p className="mb-2 text-xs text-[var(--taj-color-text-muted)]">{description}</p> : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
