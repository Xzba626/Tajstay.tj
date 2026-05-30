import type { LucideIcon } from "lucide-react";
import { CalendarDays, Heart, Home, Search, User } from "lucide-react";

/** Routes where mobile bottom tab bar is hidden (auth + role dashboards). */
export const SHELL_HIDDEN_PREFIXES = ["/auth", "/dashboard/admin", "/dashboard/owner"] as const;

export type BottomTabId = "home" | "search" | "favorites" | "bookings" | "profile";

export type BottomTabConfig = {
  id: BottomTabId;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

/** Mobile bottom navigation: Home · Search · Favorites · Trips · Profile */
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
    id: "favorites",
    href: "/favorites",
    icon: Heart,
    isActive: (p) => p.startsWith("/favorites")
  },
  {
    id: "bookings",
    href: "/dashboard/bookings",
    icon: CalendarDays,
    isActive: (p) =>
      p.startsWith("/dashboard/bookings") ||
      p.startsWith("/dashboard/guest") ||
      p.startsWith("/booking") ||
      p.startsWith("/payment") ||
      p.startsWith("/chat/booking")
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

export function getActiveBottomTabIndex(pathname: string): number {
  const idx = BOTTOM_TABS.findIndex((tab) => tab.isActive(pathname));
  return idx >= 0 ? idx : 0;
}
