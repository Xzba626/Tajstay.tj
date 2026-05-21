import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "section" | "div";
  tight?: boolean;
};

export function SectionContainer({ children, as: Tag = "section", tight, className, ...props }: Props) {
  return (
    <Tag
      className={cn(
        "taj-section-container mx-auto w-full max-w-[var(--taj-section-max)]",
        tight ? "py-[var(--taj-section-gap)]" : "py-[var(--taj-section-gap-lg)]",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
