"use client";

import { Building2, CalendarDays, Home, Menu, Users } from "lucide-react";
import type { AdminMobileTab } from "@/components/admin/mobile/admin-mobile-nav";
import { ADMIN_MOBILE_TABS } from "@/components/admin/mobile/admin-mobile-nav";

const TAB_ICONS: Record<AdminMobileTab, typeof Home> = {
  home: Home,
  properties: Building2,
  bookings: CalendarDays,
  users: Users,
  menu: Menu
};

type Props = {
  activeTab: AdminMobileTab;
  labels: {
    home: string;
    properties: string;
    bookings: string;
    users: string;
    menu: string;
  };
  onTabChange: (tab: AdminMobileTab) => void;
  drawerOpen?: boolean;
};

export function AdminMobileBottomNav({ activeTab, labels, onTabChange, drawerOpen }: Props) {
  return (
    <nav className="admin-mobile-bottom-nav lg:hidden" aria-label="Admin">
      {ADMIN_MOBILE_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const active = tab === "menu" ? drawerOpen || activeTab === tab : activeTab === tab;
        const label = labels[tab];
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
            <span className="admin-mobile-bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
