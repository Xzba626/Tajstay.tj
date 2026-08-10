"use client";

import { cn } from "@/lib/cn";
import { EmptyStateCard } from "@/components/ds/EmptyStateCard";
import { Button } from "@/components/ds/Button";

type Props = {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Retry",
  className
}: Props) {
  return (
    <EmptyStateCard
      title={title}
      description={description}
      align="center"
      className={cn("border-[var(--color-danger)]/25", className)}
      icon={
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-xl font-semibold text-[var(--color-danger)]"
          aria-hidden
        >
          !
        </span>
      }
      actions={
        onRetry ? (
          <Button type="button" variant="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null
      }
    />
  );
}
