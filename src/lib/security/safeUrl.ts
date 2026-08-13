export function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h === "0.0.0.0" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".localhost")) return true;

  // IPv4 private ranges + link-local
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split(".").map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

export function isSafePublicHttpsUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    if (isPrivateOrLocalHost(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

