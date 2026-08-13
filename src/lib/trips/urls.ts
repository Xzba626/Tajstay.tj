import type { TripsTab } from "@/lib/trips/classify";

const BASE = "/history";

export function tripsHubPath(tab: TripsTab = "confirmed", query?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (tab !== "confirmed") params.set("tab", tab);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v) params.set(k, v);
  }
  const q = params.toString();
  return q ? `${BASE}?${q}` : BASE;
}

/** Map legacy /dashboard/guest query params to History hub. */
export function tripsHubFromLegacyGuest(searchParams?: {
  notice?: string;
  error?: string;
  tab?: string;
}): string {
  const notice = searchParams?.notice?.trim();
  const error = searchParams?.error?.trim();
  let tab: TripsTab = "confirmed";
  if (error === "document") tab = "confirmed";
  return tripsHubPath(tab, {
    notice: notice || undefined,
    error: error || undefined
  });
}
