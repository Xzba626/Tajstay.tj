"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_TABS, getActiveBottomTabIndex, isShellHiddenRoute } from "@/constants/app-navigation";
import { cn } from "@/lib/cn";

export type MobileBottomNavLabels = {
  ariaLabel: string;
  home: string;
  search: string;
  favorites: string;
  bookings: string;
  profile: string;
};

const LABEL_BY_TAB = {
  home: "home",
  search: "search",
  favorites: "favorites",
  trips: "bookings",
  profile: "profile"
} as const;

export function MobileBottomNav({ labels }: { labels: MobileBottomNavLabels }) {
  const pathname = usePathname() ?? "/";

  if (isShellHiddenRoute(pathname)) return null;

  const activeIndex = getActiveBottomTabIndex(pathname);
  const tabCount = BOTTOM_TABS.length;

  return (
    <nav className="app-tab-bar md:hidden" aria-label={labels.ariaLabel}>
      <div className="app-tab-bar__dock">
        <div
          className="app-tab-bar__indicator"
          style={{
            width: `calc((100% - 0.5rem) / ${tabCount})`,
            transform: `translateX(calc(${activeIndex} * 100%))`
          }}
          aria-hidden
        />
        {BOTTOM_TABS.map((tab) => {
          const active = tab.isActive(pathname);
          const labelKey = LABEL_BY_TAB[tab.id];
          const label = labels[labelKey];
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn("app-tab-bar__item", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="app-tab-bar__icon" size={22} strokeWidth={active ? 2.35 : 1.65} aria-hidden />
              <span className="app-tab-bar__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
