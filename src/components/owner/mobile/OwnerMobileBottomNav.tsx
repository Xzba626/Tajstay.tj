"use client";

import { Building2, CalendarDays, Home, LayoutGrid, Menu } from "lucide-react";
import type { OwnerMobileTab } from "@/components/owner/mobile/owner-mobile-nav";
import { OWNER_MOBILE_TABS } from "@/components/owner/mobile/owner-mobile-nav";

const TAB_ICONS: Record<OwnerMobileTab, typeof Home> = {
  home: Home,
  properties: Building2,
  bookings: LayoutGrid,
  calendar: CalendarDays,
  menu: Menu
};

type Props = {
  activeTab: OwnerMobileTab;
  labels: {
    home: string;
    properties: string;
    bookings: string;
    calendar: string;
    menu: string;
  };
  onTabChange: (tab: OwnerMobileTab) => void;
  drawerOpen?: boolean;
};

export function OwnerMobileBottomNav({ activeTab, labels, onTabChange, drawerOpen }: Props) {
  return (
    <nav className="admin-mobile-bottom-nav lg:hidden" aria-label="Owner">
      {OWNER_MOBILE_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const active = tab === "menu" ? drawerOpen || activeTab === tab : activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            className={`admin-mobile-bottom-nav__tab${active ? " is-active" : ""}`}
            onClick={() => onTabChange(tab)}
            aria-current={active ? "page" : undefined}
            aria-expanded={tab === "menu" ? drawerOpen : undefined}
          >
            <span className="admin-mobile-bottom-nav__icon-wrap">
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {active ? <span className="admin-mobile-bottom-nav__dot" aria-hidden /> : null}
            </span>
            <span className="admin-mobile-bottom-nav__label">{labels[tab]}</span>
          </button>
        );
      })}
    </nav>
  );
}
