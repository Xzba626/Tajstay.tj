"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    <aside className="sticky top-0 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col border-r border-white/10 bg-slate-950/60 py-6 pl-4 pr-2 shadow-sm backdrop-blur-md lg:flex">
      <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{labels.sectionTitle}</div>
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
                "rounded-xl px-3 py-2.5 font-medium transition-colors",
                active ? "bg-emerald-500/15 text-emerald-200 shadow-sm ring-1 ring-emerald-300/30" : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-4 px-2 text-[11px] leading-snug text-slate-400">{labels.navHint}</p>
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
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-200 shadow-sm"
      >
        {labels.mobileNav}
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <nav className="mt-2 flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={`${pathname}?section=${item.href.slice(1)}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
