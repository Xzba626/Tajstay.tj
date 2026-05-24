"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export type OwnerSidebarLabels = {
  sectionTitle: string;
  navLabel: string;
  mobileNav: string;
  navHint?: string;
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
};

type SidebarItem = { label: string; section?: string; href?: string };

function buildItems(labels: OwnerSidebarLabels): SidebarItem[] {
  return [
    { section: "overview", label: labels.items.overview },
    { section: "properties", label: labels.items.properties },
    { section: "rooms", label: labels.items.rooms },
    { section: "bookings", label: labels.items.bookings },
    { section: "offline-bookings", label: labels.items.offlineBookings },
    { section: "calendar", label: labels.items.calendar },
    { href: "/dashboard/messages", label: labels.items.messages },
    { section: "reviews", label: labels.items.reviews },
    { section: "finances", label: labels.items.finances },
    { section: "statistics", label: labels.items.statistics },
    { section: "help", label: labels.items.help },
    { section: "notifications", label: labels.items.notifications }
  ];
}

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
    <aside className="dashboard-sidebar sticky top-0 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col py-6 pl-4 pr-2 lg:flex">
      <div className="dashboard-sidebar__title mb-4 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]">
        {labels.sectionTitle}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1 text-sm" aria-label={labels.navLabel}>
        {items.map((item) => {
          const active = isActive(pathname, section, item);
          const href = resolveHref(pathname, item);
          return (
            <Link
              key={href + item.label}
              href={href}
              scroll={!item.href}
              className={cn(
                "dashboard-sidebar__link rounded-xl px-3 py-2.5 font-medium transition-colors",
                active && "is-active"
              )}
            >
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
  const [open, setOpen] = useState(false);
  const items = buildItems(labels);

  return (
    <div className="mb-6 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm backdrop-blur-md"
        aria-expanded={open}
      >
        {labels.mobileNav}
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <nav className="mt-2 flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-2 shadow-lg backdrop-blur-xl">
          {items.map((item) => {
            const href = resolveHref(pathname, item);
            const active = isActive(pathname, section, item);
            return (
              <Link
                key={href + item.label}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-emerald-500/15 text-emerald-100" : "text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-100"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
