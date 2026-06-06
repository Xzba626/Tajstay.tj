import { parseClientIp } from "@/lib/geo/clientIp";

const CACHE = new Map<string, { geo: IpGeo | null; at: number }>();
const TTL_MS = 60 * 60 * 1000;

export type IpGeo = {
  city: string | null;
  countryCode: string | null;
};

type IpApiResponse = {
  status?: string;
  city?: string;
  countryCode?: string;
};

export async function getGeoFromIp(ip: string | null): Promise<IpGeo | null> {
  if (!ip) return null;

  const cached = CACHE.get(ip);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.geo;

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,city`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      CACHE.set(ip, { geo: null, at: Date.now() });
      return null;
    }
    const json = (await res.json()) as IpApiResponse;
    if (json.status !== "success") {
      CACHE.set(ip, { geo: null, at: Date.now() });
      return null;
    }
    const geo: IpGeo = {
      city: json.city?.trim() || null,
      countryCode: json.countryCode?.trim() || null
    };
    CACHE.set(ip, { geo, at: Date.now() });
    return geo;
  } catch {
    CACHE.set(ip, { geo: null, at: Date.now() });
    return null;
  }
}

export async function getGeoFromRequestHeaders(headers: Headers): Promise<IpGeo | null> {
  const ip = parseClientIp(headers.get("x-forwarded-for") ?? headers.get("x-real-ip"));
  return getGeoFromIp(ip);
}
