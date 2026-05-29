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

type Props = {
  labels: MobileBottomNavLabels;
  pendingTripsCount?: number;
};

export function MobileBottomNav({ labels, pendingTripsCount = 0 }: Props) {
  const pathname = usePathname() ?? "/";

  if (isShellHiddenRoute(pathname)) return null;

  const activeIndex = getActiveBottomTabIndex(pathname);

  return (
    <nav className="app-tab-bar md:hidden" aria-label={labels.ariaLabel}>
      <div className="app-tab-bar__dock">
        {BOTTOM_TABS.map((tab, index) => {
          const active = index === activeIndex;
          const labelKey = LABEL_BY_TAB[tab.id];
          const label = labels[labelKey];
          const Icon = tab.icon;
          const showBadge = tab.id === "trips" && pendingTripsCount > 0;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn("app-tab-bar__item", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <span className="app-tab-bar__icon-wrap">
                <Icon className="app-tab-bar__icon" size={22} strokeWidth={active ? 2.35 : 1.65} aria-hidden />
                {showBadge ? (
                  <span className="app-tab-bar__badge" aria-label={String(pendingTripsCount)}>
                    {pendingTripsCount > 9 ? "9+" : pendingTripsCount}
                  </span>
                ) : null}
                {active ? <span className="app-tab-bar__dot" aria-hidden /> : null}
              </span>
              <span className="app-tab-bar__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
