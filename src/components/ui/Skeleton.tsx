import type { CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className = "", style }: Props) {
  return <div className={`tz-skeleton ${className}`.trim()} style={style} aria-hidden />;
}

export function PropertyCardSkeleton() {
  return <Skeleton className="h-[85px] w-full rounded-xl" />;
}

export function AvatarSkeleton() {
  return <Skeleton className="h-20 w-20 rounded-full" />;
}
