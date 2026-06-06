import { normalizeCityKey } from "@/lib/geo/cities";
import { clientIpFromHeaders } from "@/lib/geo/clientIp";

const CACHE = new Map<string, { city: string | null; at: number }>();
const TTL_MS = 60 * 60 * 1000;

type IpApiResponse = {
  status?: string;
  city?: string;
  countryCode?: string;
};

/**
 * Resolve visitor city from IP (ip-api.com free tier).
 * Returns null on failure or non-TJ — caller falls back to default sort.
 */
export async function getCityFromIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;

  const cached = CACHE.get(ip);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.city;

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,city`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      CACHE.set(ip, { city: null, at: Date.now() });
      return null;
    }
    const json = (await res.json()) as IpApiResponse;
    if (json.status !== "success" || !json.city) {
      CACHE.set(ip, { city: null, at: Date.now() });
      return null;
    }
    if (json.countryCode && json.countryCode !== "TJ") {
      CACHE.set(ip, { city: null, at: Date.now() });
      return null;
    }
    const city = json.city.trim();
    CACHE.set(ip, { city, at: Date.now() });
    return city;
  } catch {
    CACHE.set(ip, { city: null, at: Date.now() });
    return null;
  }
}

export async function getCityFromRequestHeaders(headers: Headers): Promise<string | null> {
  return getCityFromIp(clientIpFromHeaders(headers));
}

export function sortHotelsByNearbyCity<T extends { city: string }>(hotels: T[], nearbyCity: string | null): T[] {
  if (!nearbyCity?.trim()) return hotels;
  const key = normalizeCityKey(nearbyCity);
  return [...hotels].sort((a, b) => {
    const aMatch = normalizeCityKey(a.city) === key ? 0 : 1;
    const bMatch = normalizeCityKey(b.city) === key ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return 0;
  });
}
