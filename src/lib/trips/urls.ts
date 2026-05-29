import type { TripsTab } from "@/lib/trips/classify";

const BASE = "/dashboard/bookings";

export function tripsHubPath(tab: TripsTab = "active", query?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (tab !== "active") params.set("tab", tab);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v) params.set(k, v);
  }
  const q = params.toString();
  return q ? `${BASE}?${q}` : BASE;
}

/** Map legacy /dashboard/guest query params to trips hub. */
export function tripsHubFromLegacyGuest(searchParams?: {
  notice?: string;
  error?: string;
  tab?: string;
}): string {
  const notice = searchParams?.notice?.trim();
  const error = searchParams?.error?.trim();
  let tab: TripsTab = "active";
  if (error === "document") tab = "active";
  return tripsHubPath(tab, {
    notice: notice || undefined,
    error: error || undefined
  });
}
