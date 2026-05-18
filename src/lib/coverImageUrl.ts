/** Нормализация URL обложки отеля: https… или путь от корня сайта (без внутренних адресов). */
export function parseCoverImageUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return null;
    if (!isPublicHost(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function isPublicHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return false;
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  if (h === "[::1]" || h === "::1") return false;
  if (h === "0.0.0.0") return false;
  if (h.endsWith(".local")) return false;
  // block IPv4 private ranges
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split(".").map((x) => Number(x));
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}
