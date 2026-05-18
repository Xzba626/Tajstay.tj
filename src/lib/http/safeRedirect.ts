import { getPublicOriginFromRequest } from "./publicOrigin";

/**
 * Avoid open redirects: only same-origin paths from Referer, else fallback.
 * Uses public origin (forwarded host / NEXTAUTH_URL) so Location is not localhost behind a tunnel.
 */
export function sameOriginRedirectUrl(req: Request, refererHeader: string | null | undefined, fallbackPath: string): URL {
  const origin = getPublicOriginFromRequest(req);
  const path = fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`;
  const fallback = new URL(path, origin);

  const raw = refererHeader?.trim();
  if (!raw) return fallback;

  try {
    const ref = new URL(raw);
    if (ref.origin !== new URL(origin).origin) return fallback;
    const dest = ref.pathname + ref.search + ref.hash;
    if (!dest.startsWith("/")) return fallback;
    return new URL(dest, origin);
  } catch {
    return fallback;
  }
}
