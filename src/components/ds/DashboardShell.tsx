import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  mobileNav?: ReactNode;
  className?: string;
};

export function DashboardShell({ sidebar, children, mobileNav, className }: Props) {
  const isLightWorkspace = className?.includes("admin-command-center-shell");
  return (
    <div
      className={cn(
        "taj-dashboard-shell min-h-[calc(100vh-4rem)] font-[family-name:var(--taj-font-ui)]",
        isLightWorkspace
          ? "ts-workspace-light admin-command-center-shell bg-[var(--ts-surface-page)] text-[var(--ts-text-body)]"
          : "bg-[var(--taj-color-bg)] text-[var(--taj-color-text)]",
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
