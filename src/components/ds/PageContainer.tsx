import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Width = "default" | "narrow" | "full";

const widthClass: Record<Width, string> = {
  default: "max-w-[var(--taj-page-max)]",
  narrow: "max-w-[var(--taj-page-max-narrow)]",
  full: "max-w-none"
};

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  width?: Width;
  /** Marketing pages — slightly more vertical rhythm */
  publicPage?: boolean;
};

export function PageContainer({ children, width = "default", publicPage, className, ...props }: Props) {
  return (
    <div
      className={cn(
        "taj-page-container mx-auto w-full",
        widthClass[width],
        "px-[var(--taj-page-px)]",
        publicPage ? "py-8 sm:py-10 lg:py-12" : "py-6 sm:py-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
