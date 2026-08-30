"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAdminFormBusy } from "@/components/admin/AdminNativeForm";

type Variant = "primary" | "secondary" | "destructive" | "warning" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loadingLabel?: string;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "admin-btn admin-btn--primary",
  secondary: "admin-btn admin-btn--secondary",
  destructive: "admin-btn admin-btn--destructive",
  warning: "admin-btn admin-btn--warning",
  ghost: "admin-btn admin-btn--ghost"
};

export function AdminSubmitButton({
  variant = "primary",
  loadingLabel,
  children,
  className,
  disabled,
  onClick,
  ...rest
}: Props) {
  const formCtx = useAdminFormBusy();
  const [localBusy, setLocalBusy] = useState(false);
  const busy = formCtx?.busy ?? localBusy;

  return (
    <button
      {...rest}
      type={rest.type ?? "submit"}
      disabled={disabled || busy}
      data-loading={busy ? "true" : undefined}
      className={cn(variantClass[variant], className)}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        if (!formCtx) {
          const form = event.currentTarget.form;
          if (form && !form.reportValidity()) {
            return;
          }
          setLocalBusy(true);
        }
        onClick?.(event);
      }}
    >
      {busy && loadingLabel ? loadingLabel : children}
    </button>
  );
}
