import type { PropsWithChildren } from "react";
import { AppCard } from "@/components/ds/AppCard";
import type { TajCardVariant } from "@/components/ds/types";
import { cn } from "@/lib/cn";

type CardProps = PropsWithChildren<{
  className?: string;
  variant?: "default" | "glass";
}>;

/** Backward-compatible Card — maps legacy `glass` to DS `public` variant. */
export function Card({ children, className, variant = "glass" }: CardProps) {
  const dsVariant: TajCardVariant = variant === "glass" ? "public" : "default";
  return (
    <AppCard variant={dsVariant} padding="md" className={cn(className)}>
      {children}
    </AppCard>
  );
}
