import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  mobileNav?: ReactNode;
  className?: string;
};

export function DashboardShell({ sidebar, children, mobileNav, className }: Props) {
  const isLightWorkspace =
    className?.includes("ts-workspace-light") ||
    className?.includes("admin-command-center-shell") ||
    className?.includes("owner-command-center-shell");

  return (
    <div
      className={cn(
        "taj-dashboard-shell workspace-shell min-h-[calc(100dvh-var(--workspace-header-height,3.5rem))] font-[family-name:var(--taj-font-ui)]",
        isLightWorkspace
          ? "ts-workspace-light bg-[var(--ts-surface-page)] text-[var(--ts-text-body)]"
          : "bg-[var(--taj-color-bg)] text-[var(--taj-color-text)]",
        className
      )}
    >
      <div className="taj-dashboard-inner mx-auto flex w-full max-w-[var(--taj-dashboard-max)]">
        {sidebar}
        <div className="taj-dashboard-main min-w-0 flex-1">
          <div className="taj-dashboard-content workspace-shell__content px-[var(--taj-page-px)] py-4 sm:py-6 lg:py-8">
            {children}
          </div>
          {mobileNav}
        </div>
      </div>
    </div>
  );
}
