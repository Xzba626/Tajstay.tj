"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { TripsTab } from "@/lib/trips/classify";
import { TRIPS_TABS, parseTripsTab } from "@/lib/trips/classify";
import { tripsHubPath } from "@/lib/trips/urls";
import { cn } from "@/lib/cn";

export type TripsTabLabels = Record<TripsTab, string>;

export function TripsTabNav({
  labels,
  counts,
  filtersAria
}: {
  labels: TripsTabLabels;
  counts: Partial<Record<TripsTab, number>>;
  filtersAria: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseTripsTab(searchParams.get("tab") ?? undefined);

  if (pathname !== "/history" && pathname !== "/dashboard/bookings") return null;

  return (
    <nav className="mockup-segment mb-4" aria-label={filtersAria}>
      {TRIPS_TABS.map((tab) => {
        const isActive = tab === activeTab;
        const count = counts[tab];
        return (
          <Link
            key={tab}
            href={tripsHubPath(tab)}
            className={cn("mockup-segment__item", isActive && "is-active")}
            aria-current={isActive ? "page" : undefined}
            scroll={false}
          >
            {labels[tab]}
            {typeof count === "number" && count > 0 ? ` (${count > 99 ? "99+" : count})` : ""}
          </Link>
        );
      })}
    </nav>
  );
}
