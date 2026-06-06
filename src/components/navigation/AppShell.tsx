"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isShellHiddenRoute } from "@/constants/app-navigation";

/** Sets document-level shell mode for premium mobile chrome (tab bar, compact footer). */
export function AppShell() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const hidden = isShellHiddenRoute(pathname);
    const chatFullscreen = pathname.startsWith("/chat");
    document.body.classList.toggle("app-shell", !hidden && !chatFullscreen);
    document.body.classList.toggle("app-shell--hidden-nav", hidden || chatFullscreen);
    document.body.classList.toggle("chat-fullscreen-route", chatFullscreen);
    return () => {
      document.body.classList.remove("app-shell", "app-shell--hidden-nav", "chat-fullscreen-route");
    };
  }, [pathname]);

  return null;
}
