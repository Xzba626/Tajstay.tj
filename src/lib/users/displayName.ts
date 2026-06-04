type UserNameFields = {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string;
  email?: string | null;
  telegramUsername?: string | null;
};

const GENERIC_NAMES = new Set(["man", "user", "guest", "пользователь", "меҳмон", "test"]);

function isGenericName(name: string): boolean {
  const t = name.trim().toLowerCase();
  if (!t) return true;
  if (GENERIC_NAMES.has(t)) return true;
  if (t.length <= 2) return true;
  return false;
}

/** Prefer profile names, then non-generic `name`, then @telegram, then phone/email. */
export function formatUserDisplayName(u: UserNameFields): string {
  const fromParts = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;

  const raw = (u.name ?? "").trim();
  if (raw && !isGenericName(raw)) return raw;

  if (u.telegramUsername) {
    const handle = u.telegramUsername.startsWith("@") ? u.telegramUsername : `@${u.telegramUsername}`;
    return handle;
  }

  if (u.phone?.trim()) return u.phone.trim();
  if (u.email?.trim()) return u.email.trim();

  return raw || "—";
}
