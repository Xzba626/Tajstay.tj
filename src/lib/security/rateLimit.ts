type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const MAX_KEYS = 50_000;

function prune() {
  if (store.size <= MAX_KEYS) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

/** Sliding window counter. Best-effort per instance (use Redis/edge in production scale). */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec?: number } {
  prune();
  const now = Date.now();
  let e = store.get(key);
  if (!e || now > e.resetAt) {
    e = { count: 1, resetAt: now + windowMs };
    store.set(key, e);
    return { ok: true };
  }
  if (e.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
  }
  e.count += 1;
  return { ok: true };
}

export function clientIp(req: { headers: Headers }): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim() || "0.0.0.0";
  return req.headers.get("x-real-ip")?.trim() || "0.0.0.0";
}
