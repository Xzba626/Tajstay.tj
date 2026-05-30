/** Mask email: a***@domain.com */
export function maskEmail(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const [local, domain] = raw.trim().split("@");
  if (!domain) return raw;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function formatTelegram(username: string | null | undefined, telegramId: string | null | undefined): string | null {
  if (username?.trim()) return `@${username.replace(/^@/, "")}`;
  if (telegramId) return `ID ${telegramId.slice(0, 4)}…`;
  return null;
}
