import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  style?: CSSProperties;
};

/** Generic shimmer block — uses Design System skeleton token surface. */
export function Skeleton({ className = "", style }: Props) {
  return <div className={cn("taj-skeleton", className)} style={style} aria-hidden />;
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--taj-radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3 rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function AvatarSkeleton() {
  return <Skeleton className="h-12 w-12 rounded-full" />;
}

export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-11 w-full rounded-[var(--taj-radius-md)]" />
        </div>
      ))}
    </div>
  );
}
