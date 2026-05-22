import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  mobileNav?: ReactNode;
  className?: string;
};

export function DashboardShell({ sidebar, children, mobileNav, className }: Props) {
  return (
    <div
      className={cn(
        "taj-dashboard-shell min-h-[calc(100vh-4rem)] bg-[var(--taj-color-bg)] font-[family-name:var(--taj-font-ui)] text-[var(--taj-color-text)]",
        className
      )}
    >
      <div className="taj-dashboard-inner mx-auto flex w-full max-w-[var(--taj-dashboard-max)]">
        {sidebar}
        <div className="taj-dashboard-main min-w-0 flex-1">
          {mobileNav}
          <div
            className="taj-dashboard-content px-[var(--taj-page-px)] py-6 sm:py-8 lg:py-10"
            data-reveal
            data-stagger="60"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
