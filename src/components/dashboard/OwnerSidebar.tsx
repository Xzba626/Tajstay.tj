"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Star,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/cn";

export type OwnerSidebarLabels = {
  sectionTitle: string;
  navLabel: string;
  mobileNav: string;
  navHint?: string;
  mobileMore: string;
  items: {
    overview: string;
    properties: string;
    rooms: string;
    bookings: string;
    offlineBookings: string;
    calendar: string;
    messages: string;
    reviews: string;
    finances: string;
    statistics: string;
    help: string;
    notifications: string;
  };
  mobileShort?: {
    overview: string;
    properties: string;
    bookings: string;
    finances: string;
  };
};

type SidebarItem = {
  section?: string;
  href?: string;
  label: string;
  Icon: typeof LayoutDashboard;
};

function buildItems(labels: OwnerSidebarLabels): SidebarItem[] {
  return [
    { section: "overview", label: labels.items.overview, Icon: LayoutDashboard },
    { section: "properties", label: labels.items.properties, Icon: Building2 },
    { section: "rooms", label: labels.items.rooms, Icon: BedDouble },
    { section: "bookings", label: labels.items.bookings, Icon: Wallet },
    { section: "offline-bookings", label: labels.items.offlineBookings, Icon: Wallet },
    { section: "calendar", label: labels.items.calendar, Icon: CalendarDays },
    { href: "/dashboard/messages", label: labels.items.messages, Icon: MessageSquare },
    { section: "reviews", label: labels.items.reviews, Icon: Star },
    { section: "finances", label: labels.items.finances, Icon: CreditCard },
    { section: "statistics", label: labels.items.statistics, Icon: BarChart3 },
    { section: "help", label: labels.items.help, Icon: CircleHelp },
    { section: "notifications", label: labels.items.notifications, Icon: Bell }
  ];
}

const MOBILE_PRIMARY = ["overview", "properties", "bookings", "finances"] as const;

function resolveHref(pathname: string, item: SidebarItem): string {
  if (item.href) return item.href;
  return `${pathname}?section=${item.section ?? "overview"}`;
}

function isActive(pathname: string, section: string, item: SidebarItem): boolean {
  if (item.href) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return section === (item.section ?? "overview");
}

export function OwnerSidebar({ labels }: { labels: OwnerSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "overview";
  const items = buildItems(labels);

  return (
    <aside className="owner-sidebar" aria-label={labels.navLabel}>
      <p className="owner-sidebar__title">{labels.sectionTitle}</p>
      <nav className="owner-sidebar__nav">
        {items.map((item) => {
          const active = isActive(pathname, section, item);
          const href = resolveHref(pathname, item);
          return (
            <Link
              key={href + item.label}
              href={href}
              scroll={!item.href}
              className={cn("owner-sidebar__link", active && "is-active")}
            >
              <span className="owner-sidebar__link-icon">
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

export function OwnerMobileNav({ labels }: { labels: OwnerSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "overview";
  const items = buildItems(labels);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = items.filter((item) =>
    item.section ? MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number]) : false
  );
  const moreItems = items.filter(
    (item) => !item.section || !MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number])
  );
  const moreActive = moreItems.some((item) => isActive(pathname, section, item));

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
      <nav className="owner-mobile-bottom-nav lg:hidden" aria-label={labels.mobileNav}>
        {primaryItems.map((item) => {
          const active = isActive(pathname, section, item);
          const href = resolveHref(pathname, item);
          const shortLabel =
            labels.mobileShort?.[item.section as keyof NonNullable<OwnerSidebarLabels["mobileShort"]>] ?? item.label;
          return (
            <Link
              key={href}
              href={href}
              className={cn("owner-mobile-bottom-nav__link", active && "is-active")}
            >
              <item.Icon className="owner-mobile-bottom-nav__icon" aria-hidden />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={cn("owner-mobile-bottom-nav__link", (moreOpen || moreActive) && "is-active")}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <Menu className="owner-mobile-bottom-nav__icon" aria-hidden />
          <span>{labels.mobileMore}</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <button
            type="button"
            className="owner-mobile-more-backdrop lg:hidden"
            aria-label={labels.mobileMore}
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="owner-mobile-more-sheet lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={labels.mobileMore}
          >
            <div className="owner-mobile-more-sheet__head">
              <h2 className="owner-mobile-more-sheet__title">{labels.mobileMore}</h2>
              <button
                type="button"
                className="owner-mobile-more-sheet__close"
                onClick={() => setMoreOpen(false)}
                aria-label="×"
              >
                ×
              </button>
            </div>
            <div className="owner-mobile-more-sheet__grid">
              {moreItems.map((item) => {
                const active = isActive(pathname, section, item);
                const href = resolveHref(pathname, item);
                return (
                  <Link
                    key={href + item.label}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn("owner-mobile-more-sheet__link", active && "is-active")}
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
