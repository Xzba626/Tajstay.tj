/**
 * Admin security helpers (P0-S1).
 * Shared "secret word" is retired as an AuthN/AuthZ factor.
 * Emergency recovery uses only ADMIN_SECURITY_RESET_SECRET (env), fail-closed if unset/weak.
 */

export function isAdminSecurityResetConfigured(): boolean {
  const expected = (process.env.ADMIN_SECURITY_RESET_SECRET ?? "").trim();
  return expected.length >= 16;
}

export function verifyAdminSecurityResetSecret(provided: string): boolean {
  const expected = (process.env.ADMIN_SECURITY_RESET_SECRET ?? "").trim();
  if (!expected || expected.length < 16) return false;
  return provided.trim() === expected;
}

/** @deprecated Secret word removed — always false. Kept to catch stale imports at compile time. */
export async function verifyAdminSecretWord(_input: string): Promise<boolean> {
  return false;
}
