"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  UserCog,
  Users,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/cn";
import { WorkspaceMobileDrawer } from "@/components/navigation/WorkspaceMobileDrawer";
import { BodyPortal } from "@/components/navigation/BodyPortal";
import { subscribeWorkspaceDrawerOpen } from "@/lib/workspace/workspace-nav-bridge";

export type AdminSidebarLabels = {
  sectionTitle: string;
  navLabel: string;
  mobileNav: string;
  navHint: string;
  mobileMore: string;
  drawerGroupSecondary?: string;
  drawerGroups: {
    hotels: string;
    platform: string;
    finance: string;
    operations: string;
    access: string;
  };
  sidebarGroups: {
    overview: string;
    people: string;
    hotelOps: string;
    platform: string;
    finance: string;
    operations: string;
  };
  items: {
    dashboard: string;
    content: string;
    applications: string;
    hotels: string;
    users: string;
    ownerAccess: string;
    bookings: string;
    finance: string;
    complaints: string;
    notifications: string;
  };
  mobileShort?: {
    dashboard: string;
    applications: string;
    users: string;
    hotels: string;
  };
};

type SidebarItem = {
  section: string;
  label: string;
  Icon: typeof LayoutDashboard;
};

const DRAWER_GROUP_SECTIONS = [
  { key: "platform" as const, sections: ["content"] },
  { key: "finance" as const, sections: ["finance"] },
  // "bookings" moved out of the primary mobile tabs (replaced by "hotels", now primary) but was
  // never added to any drawer group, so it silently had nowhere to appear on mobile at all —
  // real gap, fixed here.
  { key: "operations" as const, sections: ["bookings", "complaints", "notifications"] },
  { key: "access" as const, sections: ["owner-access"] }
];

const SIDEBAR_GROUPS = [
  { key: "overview" as const, sections: ["dashboard"] },
  { key: "people" as const, sections: ["applications", "users", "owner-access"] },
  { key: "hotelOps" as const, sections: ["hotels", "bookings"] },
  { key: "platform" as const, sections: ["content"] },
  { key: "finance" as const, sections: ["finance"] },
  { key: "operations" as const, sections: ["complaints", "notifications"] }
];

function buildItems(labels: AdminSidebarLabels): SidebarItem[] {
  return [
    { section: "dashboard", label: labels.items.dashboard, Icon: LayoutDashboard },
    { section: "content", label: labels.items.content, Icon: FileText },
    { section: "applications", label: labels.items.applications, Icon: ClipboardList },
    { section: "hotels", label: labels.items.hotels, Icon: Building2 },
    { section: "users", label: labels.items.users, Icon: Users },
    { section: "owner-access", label: labels.items.ownerAccess, Icon: UserCog },
    { section: "bookings", label: labels.items.bookings, Icon: Wallet },
    { section: "finance", label: labels.items.finance, Icon: CreditCard },
    { section: "complaints", label: labels.items.complaints, Icon: AlertTriangle },
    { section: "notifications", label: labels.items.notifications, Icon: Bell }
  ];
}

// "bookings" removed from primary mobile tabs per product decision: Admin needs booking
// oversight for support/disputes/payments, but it isn't one of the 5 most common daily mobile
// destinations — it now lives in "Ещё" (still in SIDEBAR_GROUPS/buildItems above, unchanged).
const MOBILE_PRIMARY = ["dashboard", "applications", "hotels", "users"] as const;

function sectionHref(pathname: string, section: string) {
  return `${pathname}?section=${section}`;
}

export function AdminSidebar({ labels }: { labels: AdminSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "dashboard";
  const items = buildItems(labels);
  const itemsBySection = new Map(items.map((item) => [item.section, item]));

  return (
    <aside className="admin-sidebar" aria-label={labels.navLabel}>
      <p className="admin-sidebar__title">{labels.sectionTitle}</p>
      <nav className="admin-sidebar__nav">
        {SIDEBAR_GROUPS.map((group) => {
          const groupItems = group.sections
            .map((sectionKey) => itemsBySection.get(sectionKey))
            .filter((item): item is SidebarItem => Boolean(item));
          if (groupItems.length === 0) return null;

          return (
            <div key={group.key} className="admin-sidebar__group">
              <p className="admin-sidebar__group-label">{labels.sidebarGroups[group.key]}</p>
              {groupItems.map((item) => {
                const active = section === item.section;
                return (
                  <Link
                    key={item.section}
                    href={sectionHref(pathname, item.section)}
                    scroll
                    className={cn("admin-sidebar__link", active && "is-active")}
                  >
                    <span className="admin-sidebar__link-icon">
                      <item.Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function AdminMobileNav({ labels }: { labels: AdminSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "dashboard";
  const items = buildItems(labels);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => subscribeWorkspaceDrawerOpen("admin", () => setMoreOpen(true)), []);

  const primaryItems = items.filter((item) => MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number]));
  const moreItems = items.filter((item) => !MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number]));
  const moreActive = moreItems.some((item) => item.section === section);
  const itemsBySection = new Map(moreItems.map((item) => [item.section, item]));

  return (
    <>
      <BodyPortal>
      <nav className="workspace-mobile-bottom-nav admin-mobile-bottom-nav lg:hidden" aria-label={labels.mobileNav}>
        {primaryItems.map((item) => {
          const active = section === item.section;
          const shortLabel =
            labels.mobileShort?.[item.section as keyof NonNullable<AdminSidebarLabels["mobileShort"]>] ?? item.label;
          return (
            <Link
              key={item.section}
              href={sectionHref(pathname, item.section)}
              className={cn("workspace-mobile-bottom-nav__link admin-mobile-bottom-nav__link", active && "is-active")}
            >
              <item.Icon className="workspace-mobile-bottom-nav__icon admin-mobile-bottom-nav__icon" aria-hidden />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={cn(
            "workspace-mobile-bottom-nav__link admin-mobile-bottom-nav__link",
            (moreOpen || moreActive) && "is-active"
          )}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <Menu className="workspace-mobile-bottom-nav__icon admin-mobile-bottom-nav__icon" aria-hidden />
          <span>{labels.mobileMore}</span>
        </button>
      </nav>
      </BodyPortal>

      <WorkspaceMobileDrawer
        open={moreOpen}
        title={labels.mobileMore}
        ariaLabel={labels.mobileMore}
        onClose={() => setMoreOpen(false)}
      >
        {DRAWER_GROUP_SECTIONS.map((group) => {
          const groupItems = group.sections
            .map((sectionKey) => itemsBySection.get(sectionKey))
            .filter((item): item is SidebarItem => Boolean(item));
          if (groupItems.length === 0) return null;

          return (
            <div key={group.key} className="workspace-mobile-drawer__group">
              <p className="workspace-mobile-drawer__group-title">{labels.drawerGroups[group.key]}</p>
              {groupItems.map((item) => {
                const active = section === item.section;
                return (
                  <Link
                    key={item.section}
                    href={sectionHref(pathname, item.section)}
                    onClick={() => setMoreOpen(false)}
                    className={cn("workspace-mobile-drawer__link", active && "is-active")}
                  >
                    <span className="workspace-mobile-drawer__link-icon">
                      <item.Icon size={18} aria-hidden />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </WorkspaceMobileDrawer>
    </>
  );
}
