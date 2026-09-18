import { prisma } from "@/lib/prisma";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

/**
 * Durable PostgreSQL rate limiter for Local Vault.
 * Does not use global in-memory rateLimit.ts.
 */
export async function lvRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = new Date();
  const existing = await prisma.localVaultRateBucket.findUnique({ where: { id: key } });

  if (!existing || existing.resetAt.getTime() <= now.getTime()) {
    const resetAt = new Date(now.getTime() + windowMs);
    await prisma.localVaultRateBucket.upsert({
      where: { id: key },
      create: { id: key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000));
    return { ok: false, retryAfterSec };
  }

  await prisma.localVaultRateBucket.update({
    where: { id: key },
    data: { count: { increment: 1 } },
  });
  return { ok: true };
}

export async function assertLvRateLimits(
  checks: Array<{ key: string; limit: number; windowMs: number }>
): Promise<void> {
  for (const c of checks) {
    const r = await lvRateLimit(c.key, c.limit, c.windowMs);
    if (!r.ok) {
      throw new LvError(LV_ERROR.RATE_LIMITED, 429, r.retryAfterSec);
    }
  }
}

/** Defense-in-depth IP. Prefer x-real-ip; do not trust raw client XFF alone. */
export function lvClientIp(req: { headers: Headers }): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  // NOT PROVEN trusted on all deployments — still used as one of several buckets.
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const parts = xf.split(",").map((p) => p.trim()).filter(Boolean);
    // Use last hop when multiple (closer to edge) — still NOT PROVEN.
    return parts[parts.length - 1] || "0.0.0.0";
  }
  return "0.0.0.0";
}

export const LV_RL = {
  CODE_CREATE_USER: { limit: 10, windowMs: 10 * 60_000 },
  CODE_CREATE_HOTEL: { limit: 10, windowMs: 10 * 60_000 },
  ACTIVATE_IP: { limit: 20, windowMs: 10 * 60_000 },
  ACTIVATE_CODE: { limit: 5, windowMs: 10 * 60_000 },
  ACTIVATE_DEVICE: { limit: 10, windowMs: 10 * 60_000 },
  DEVICE_IP: { limit: 120, windowMs: 60_000 },
  DEVICE_ID: { limit: 60, windowMs: 60_000 },
} as const;
