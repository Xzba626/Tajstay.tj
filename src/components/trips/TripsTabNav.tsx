"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { TripsTab } from "@/lib/trips/classify";
import { TRIPS_TABS } from "@/lib/trips/classify";
import { tripsHubPath } from "@/lib/trips/urls";
import { cn } from "@/lib/cn";

export type TripsTabLabels = Record<TripsTab, string>;

export function TripsTabNav({ labels, counts }: { labels: TripsTabLabels; counts: Partial<Record<TripsTab, number>> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("tab") ?? "active").toLowerCase() as TripsTab;
  const activeTab = TRIPS_TABS.includes(current) ? current : "active";

  if (pathname !== "/dashboard/bookings") return null;

  return (
    <nav className="mockup-segment mb-4" aria-label={labels.active}>
      {TRIPS_TABS.map((tab) => {
        const isActive = tab === activeTab;
        const count = counts[tab];
        return (
          <Link
            key={tab}
            href={tripsHubPath(tab)}
            className={cn("mockup-segment__item", isActive && "is-active")}
            aria-current={isActive ? "page" : undefined}
          >
            {labels[tab]}
            {typeof count === "number" && count > 0 ? ` (${count > 99 ? "99+" : count})` : ""}
          </Link>
        );
      })}
    </nav>
  );
}
