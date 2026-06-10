"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export type AdminSidebarLabels = {
  sectionTitle: string;
  navLabel: string;
  mobileNav: string;
  navHint: string;
  items: {
    dashboard: string;
    content: string;
    propertyTypes: string;
    applications: string;
    hotels: string;
    users: string;
    ownerAccess: string;
    bookings: string;
    finance: string;
    complaints: string;
    notifications: string;
  };
};

type SidebarItem = { href: string; label: string };

function buildItems(labels: AdminSidebarLabels): SidebarItem[] {
  return [
    { href: "#dashboard", label: labels.items.dashboard },
    { href: "#content", label: labels.items.content },
    { href: "#property-types", label: labels.items.propertyTypes },
    { href: "#applications", label: labels.items.applications },
    { href: "#hotels", label: labels.items.hotels },
    { href: "#users", label: labels.items.users },
    { href: "#owner-access", label: labels.items.ownerAccess },
    { href: "#bookings", label: labels.items.bookings },
    { href: "#finance", label: labels.items.finance },
    { href: "#complaints", label: labels.items.complaints },
    { href: "#notifications", label: labels.items.notifications }
  ];
}

export function AdminSidebar({ labels }: { labels: AdminSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "dashboard";
  const items = buildItems(labels);

  return (
    <aside className="dashboard-sidebar sticky top-0 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col py-6 pl-4 pr-2 lg:flex">
      <div className="dashboard-sidebar__title mb-4 px-2 text-xs font-semibold uppercase tracking-wider">{labels.sectionTitle}</div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1 text-sm" aria-label={labels.navLabel}>
        {items.map((item) => {
          const itemSection = item.href.slice(1);
          const active = section === itemSection;
          return (
            <Link
              key={item.href}
              href={`${pathname}?section=${itemSection}`}
              scroll
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
      <p className="dashboard-sidebar__title mt-4 px-2 text-[11px] leading-snug">{labels.navHint}</p>
    </aside>
  );
}

export function AdminMobileNav({ labels }: { labels: AdminSidebarLabels }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = buildItems(labels);

  return (
    <div className="mb-6 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="taj-surface-card flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--taj-text)] shadow-sm"
      >
        {labels.mobileNav}
        <span className="text-[var(--taj-text-muted)]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <nav className="taj-surface-card mt-2 flex flex-col gap-1 rounded-xl p-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={`${pathname}?section=${item.href.slice(1)}`}
              onClick={() => setOpen(false)}
              className="dashboard-sidebar__link rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
