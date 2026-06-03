/**
 * Prisma migrate needs a non-pooler Postgres URL (advisory locks).
 * When only Neon pooled DATABASE_URL is configured, derive DIRECT_URL.
 */
export function ensureDirectUrl() {
  if (process.env.DIRECT_URL?.trim()) return;
  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) return;
  if (!pooled.includes("-pooler")) {
    process.env.DIRECT_URL = pooled;
    return;
  }
  process.env.DIRECT_URL = pooled.replace("-pooler", "");
}
