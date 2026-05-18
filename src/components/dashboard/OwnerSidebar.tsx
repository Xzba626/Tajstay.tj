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
    calendar: string;
    notifications: string;
  };
};

type SidebarItem = { href: string; label: string };

function buildItems(labels: OwnerSidebarLabels): SidebarItem[] {
  return [
    { href: "#overview", label: labels.items.overview },
    { href: "#properties", label: labels.items.properties },
    { href: "#rooms", label: labels.items.rooms },
    { href: "#bookings", label: labels.items.bookings },
    { href: "#calendar", label: labels.items.calendar },
    { href: "#notifications", label: labels.items.notifications }
  ];
}

export function OwnerSidebar({ labels }: { labels: OwnerSidebarLabels }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "overview";
  const items = buildItems(labels);

  return (
    <aside className="sticky top-0 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col border-r border-white/10 bg-[#0f1c11] py-6 pl-4 pr-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl lg:flex">
      <div className="mb-4 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(240,237,232,0.3)]">{labels.sectionTitle}</div>
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
                active
                  ? "bg-[rgba(34,197,94,0.1)] text-[var(--brand-green)] shadow-sm ring-1 ring-emerald-400/25 border-l-2 border-l-[var(--brand-green)]"
                  : "text-[rgba(240,237,232,0.55)] hover:bg-white/5 hover:text-slate-100"
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
          {items.map((item) => (
            <Link
              key={item.href}
              href={`${pathname}?section=${item.href.slice(1)}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
