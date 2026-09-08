"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
};

/** App header stays visible — never hides on scroll (Admin/Owner and Consumer). */
export function SiteHeaderFrame({ children }: Props) {
  const [workspaceMode, setWorkspaceMode] = useState(false);

  useEffect(() => {
    const syncWorkspace = () => {
      setWorkspaceMode(document.body.classList.contains("app-shell--workspace"));
    };
    syncWorkspace();
    const observer = new MutationObserver(syncWorkspace);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "site-header site-header--locked sticky top-0 z-[100]",
        workspaceMode && "site-header--workspace-fixed"
      )}
    >
      {children}
    </header>
  );
}
