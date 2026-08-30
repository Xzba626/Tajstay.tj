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

export type AdminSidebarLabels = {
  sectionTitle: string;
  navLabel: string;
  mobileNav: string;
  navHint: string;
  mobileMore: string;
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
    bookings: string;
  };
};

type SidebarItem = {
  section: string;
  label: string;
  Icon: typeof LayoutDashboard;
};

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

const MOBILE_PRIMARY = ["dashboard", "applications", "users", "bookings"] as const;

function sectionHref(pathname: string, section: string) {
  return `${pathname}?section=${section}`;
}

export function AdminSidebar({ labels }: { labels: AdminSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "dashboard";
  const items = buildItems(labels);

  return (
    <aside className="admin-sidebar" aria-label={labels.navLabel}>
      <p className="admin-sidebar__title">{labels.sectionTitle}</p>
      <nav className="admin-sidebar__nav">
        {items.map((item) => {
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

  const primaryItems = items.filter((item) => MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number]));
  const moreItems = items.filter((item) => !MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number]));
  const moreActive = moreItems.some((item) => item.section === section);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      <nav className="admin-mobile-bottom-nav lg:hidden" aria-label={labels.mobileNav}>
        {primaryItems.map((item) => {
          const active = section === item.section;
          const shortLabel =
            labels.mobileShort?.[item.section as keyof NonNullable<AdminSidebarLabels["mobileShort"]>] ?? item.label;
          return (
            <Link
              key={item.section}
              href={sectionHref(pathname, item.section)}
              className={cn("admin-mobile-bottom-nav__link", active && "is-active")}
            >
              <item.Icon className="admin-mobile-bottom-nav__icon" aria-hidden />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={cn("admin-mobile-bottom-nav__link", (moreOpen || moreActive) && "is-active")}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <Menu className="admin-mobile-bottom-nav__icon" aria-hidden />
          <span>{labels.mobileMore}</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <button
            type="button"
            className="admin-mobile-more-backdrop lg:hidden"
            aria-label={labels.mobileMore}
            onClick={() => setMoreOpen(false)}
          />
          <div className="admin-mobile-more-sheet lg:hidden" role="dialog" aria-modal="true" aria-label={labels.mobileMore}>
            <div className="admin-mobile-more-sheet__head">
              <h2 className="admin-mobile-more-sheet__title">{labels.mobileMore}</h2>
              <button type="button" className="admin-mobile-more-sheet__close" onClick={() => setMoreOpen(false)} aria-label="×">
                ×
              </button>
            </div>
            <div className="admin-mobile-more-sheet__grid">
              {moreItems.map((item) => {
                const active = section === item.section;
                return (
                  <Link
                    key={item.section}
                    href={sectionHref(pathname, item.section)}
                    onClick={() => setMoreOpen(false)}
                    className={cn("admin-mobile-more-sheet__link", active && "is-active")}
                  >
                    <item.Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
