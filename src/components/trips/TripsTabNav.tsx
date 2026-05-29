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
    <nav className="trips-tab-nav" aria-label={labels.active}>
      <div className="trips-tab-nav__scroll">
        {TRIPS_TABS.map((tab) => {
          const isActive = tab === activeTab;
          const count = counts[tab];
          return (
            <Link
              key={tab}
              href={tripsHubPath(tab)}
              className={cn("trips-tab-nav__item", isActive && "is-active")}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{labels[tab]}</span>
              {typeof count === "number" && count > 0 ? (
                <span className="trips-tab-nav__badge">{count > 99 ? "99+" : count}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
