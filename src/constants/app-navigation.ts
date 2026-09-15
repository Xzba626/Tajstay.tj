import type { LucideIcon } from "lucide-react";
import { Compass, History, Home, Search, User } from "lucide-react";

/** Routes where mobile bottom tab bar is hidden (auth + role dashboards).
 *  BLOCK 5.6A: /chat/booking added — the fullscreen active booking chat must not compete for
 *  viewport with the global tab bar, and the floating TST Assistant (gated by the same helper,
 *  see TstAssistant.tsx) must not overlap the chat composer. Both reuse this one list.
 *  BLOCK V1: /booking added — the booking wizard is a focused transactional flow; the assistant
 *  and bottom nav were overlapping the wizard's CTA/fields on mobile. Route-scoped, not a global
 *  suppression — every other page keeps both. */
export const SHELL_HIDDEN_PREFIXES = ["/auth", "/dashboard/admin", "/dashboard/owner", "/chat/booking", "/booking"] as const;

/** App-like hubs: hide marketing footer on mobile; use profile/settings for legal links. */
export const WORKSPACE_PREFIXES = ["/profile", "/dashboard/admin", "/dashboard/owner"] as const;

export type BottomTabId = "home" | "search" | "tours" | "history" | "profile";

export type BottomTabConfig = {
  id: BottomTabId;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

/** Mobile bottom navigation: Home · Search · Tours · History · Profile */
export const BOTTOM_TABS: BottomTabConfig[] = [
  {
    id: "home",
    href: "/",
    icon: Home,
    isActive: (p) => p === "/"
  },
  {
    id: "search",
    href: "/search",
    icon: Search,
    isActive: (p) => p.startsWith("/search") || p.startsWith("/map") || p.startsWith("/hotel")
  },
  {
    id: "tours",
    href: "/tours",
    icon: Compass,
    isActive: (p) => p.startsWith("/tours")
  },
  {
    id: "history",
    href: "/history",
    icon: History,
    isActive: (p) =>
      p.startsWith("/history") ||
      p.startsWith("/dashboard/bookings") ||
      p.startsWith("/dashboard/guest")
  },
  {
    id: "profile",
    href: "/profile",
    icon: User,
    isActive: (p) => p.startsWith("/profile")
  }
];

export function isShellHiddenRoute(pathname: string): boolean {
  return SHELL_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isWorkspaceRoute(pathname: string): boolean {
  return WORKSPACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getActiveBottomTabIndex(pathname: string): number {
  const idx = BOTTOM_TABS.findIndex((tab) => tab.isActive(pathname));
  return idx >= 0 ? idx : 0;
}
