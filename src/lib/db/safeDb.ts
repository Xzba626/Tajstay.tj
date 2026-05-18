/** True when Prisma can resolve DATABASE_URL (build + runtime). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Run a DB query; on missing DATABASE_URL or connection errors return fallback
 * instead of crashing SSR / static generation.
 */
export async function safeDbQuery<T>(
  label: string,
  query: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isDatabaseConfigured()) {
    return fallback;
  }
  try {
    return await query();
  } catch (error) {
    console.error(`[db:${label}]`, error);
    return fallback;
  }
}
