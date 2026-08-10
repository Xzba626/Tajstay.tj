"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyStateCard } from "@/components/ds/EmptyStateCard";
import { Button } from "@/components/ds/Button";
import { TajikPattern } from "@/components/ds/TajikPattern";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: Props) {
  return (
    <EmptyStateCard
      title={title}
      description={description}
      actions={action}
      icon={
        icon ?? (
            <span className="relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <TajikPattern kind="chakan" className="absolute inset-0" />
            <TajikPattern kind="micro" className="relative z-[1]" />
          </span>
        )
      }
      align="center"
      className={cn(className)}
    />
  );
}
