/** Haversine distance in km between two WGS84 points. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GeoCoords = { lat: number; lng: number };

export function sortByDistance<T extends { lat?: number | null; lng?: number | null }>(
  items: T[],
  origin: GeoCoords
): T[] {
  return [...items].sort((a, b) => {
    const da =
      a.lat != null && a.lng != null ? distanceKm(origin.lat, origin.lng, a.lat, a.lng) : Number.POSITIVE_INFINITY;
    const db =
      b.lat != null && b.lng != null ? distanceKm(origin.lat, origin.lng, b.lat, b.lng) : Number.POSITIVE_INFINITY;
    return da - db;
  });
}
