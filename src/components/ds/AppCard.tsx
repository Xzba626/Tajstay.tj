import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TajCardPadding, TajCardVariant } from "@/components/ds/types";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: TajCardVariant;
  padding?: TajCardPadding;
  children: ReactNode;
};

const paddingMap: Record<TajCardPadding, string> = {
  none: "",
  sm: "taj-card--padding-sm",
  md: "taj-card--padding-md",
  lg: "taj-card--padding-lg"
};

export function AppCard({ variant = "default", padding = "md", className, children, ...props }: Props) {
  return (
    <div
      className={cn(
        "taj-card",
        variant === "elevated" && "taj-card--elevated",
        variant === "public" && "taj-card--public",
        variant === "outline" && "taj-card--outline",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
