"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyStateCard } from "@/components/ds";

export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyStateCard
      title={title}
      description={description}
      actions={action}
      align="center"
      className={cn(className)}
    />
  );
}
