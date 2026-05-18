const BAD_DEFAULTS = new Set([
  "tajstay-secret-key-change-this-in-production",
  "tajstay-secret",
  "change-me-dev-secret",
  "changeme",
  "secret",
  "password"
]);

function isBadSecret(s: string | undefined | null): boolean {
  const v = (s ?? "").trim();
  if (!v) return true;
  if (v.length < 32) return true;
  if (BAD_DEFAULTS.has(v)) return true;
  return false;
}

/**
 * Fail fast in production if insecure defaults are used.
 * Keep it server-only (import from server components / route handlers).
 */
export function assertProdSecrets() {
  if (process.env.NODE_ENV !== "production") return;

  const authSecret = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
  if (isBadSecret(authSecret)) {
    throw new Error(
      "Security misconfiguration: set AUTH_SECRET (or NEXTAUTH_SECRET) to a strong random value (>=32 chars) and do not use default placeholders."
    );
  }

  const seedSecret = (process.env.SEED_SECRET ?? "").trim();
  // Seed endpoint should not be usable in production with a default secret.
  if (seedSecret && BAD_DEFAULTS.has(seedSecret)) {
    throw new Error("Security misconfiguration: SEED_SECRET is using an insecure default. Override it in production.");
  }
}

