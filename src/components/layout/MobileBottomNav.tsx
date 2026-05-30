"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_TABS, getActiveBottomTabIndex, isShellHiddenRoute } from "@/constants/app-navigation";
import { cn } from "@/lib/cn";

export type MobileBottomNavLabels = {
  ariaLabel: string;
  home: string;
  favorites: string;
  bookings: string;
  notifications: string;
  profile: string;
};

const LABEL_BY_TAB = {
  home: "home",
  favorites: "favorites",
  bookings: "bookings",
  notifications: "notifications",
  profile: "profile"
} as const;

type Props = {
  labels: MobileBottomNavLabels;
  pendingBookingsCount?: number;
  unreadNotificationsCount?: number;
};

export function MobileBottomNav({
  labels,
  pendingBookingsCount = 0,
  unreadNotificationsCount = 0
}: Props) {
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
          const badge =
            tab.id === "bookings" && pendingBookingsCount > 0
              ? pendingBookingsCount
              : tab.id === "notifications" && unreadNotificationsCount > 0
                ? unreadNotificationsCount
                : 0;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn("app-tab-bar__item", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <span className="app-tab-bar__icon-wrap">
                <Icon className="app-tab-bar__icon" size={22} strokeWidth={active ? 2.35 : 1.65} aria-hidden />
                {badge > 0 ? (
                  <span className="app-tab-bar__badge" aria-label={String(badge)}>
                    {badge > 9 ? "9+" : badge}
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
