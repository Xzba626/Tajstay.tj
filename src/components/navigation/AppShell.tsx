"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isShellHiddenRoute } from "@/constants/app-navigation";

/** Sets document-level shell mode for premium mobile chrome (tab bar, compact footer). */
export function AppShell() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const shell = !isShellHiddenRoute(pathname);
    document.body.classList.toggle("app-shell", shell);
    document.body.classList.toggle("app-shell--hidden-nav", !shell);
    return () => {
      document.body.classList.remove("app-shell", "app-shell--hidden-nav");
    };
  }, [pathname]);

  return null;
}
