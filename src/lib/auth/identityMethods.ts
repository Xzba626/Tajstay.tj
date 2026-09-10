import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";

/**
 * Canonical sign-in identity model — one reusable helper instead of scattered UI conditions.
 *
 * `User.password` is a non-nullable schema field, so its presence never proves the account
 * actually uses password authentication: Google/Telegram signups get a random, unusable hash
 * there purely to satisfy the column constraint (see accountPhone.ts for the same pattern on
 * `phone`). The only reliable signals are the linked NextAuth `Account` rows (OAuth provider)
 * and `telegramId` — both written only when that sign-in method was actually used.
 */

export type SignInMethod = "google" | "telegram" | "phone" | "password";

export type IdentityCapabilities = {
  methods: SignInMethod[];
  /** Primary method to show in a compact "Способ входа: X" label. */
  primaryMethod: SignInMethod;
  /**
   * Whether a TajStay password reset is a meaningful action for this account. False for
   * Google/Telegram-only accounts — their `password` hash is a random placeholder they never
   * use to sign in, so offering to reset it is confusing, not helpful.
   */
  canResetPassword: boolean;
};

export function resolveIdentityCapabilities(user: {
  phone: string | null;
  telegramId?: string | null;
  phoneVerified?: boolean | null;
  accounts?: Array<{ provider: string }>;
}): IdentityCapabilities {
  const hasGoogle = (user.accounts ?? []).some((a) => a.provider === "google");
  const hasTelegram = Boolean(user.telegramId);
  const hasRealPhone = Boolean(user.phoneVerified) && !isPlaceholderAccountPhone(user.phone);
  // A password-based account is one with none of the above — i.e. registered via email/password
  // (or legacy phone+password) rather than an external identity provider.
  const hasPassword = !hasGoogle && !hasTelegram && !hasRealPhone;

  const methods: SignInMethod[] = [];
  if (hasGoogle) methods.push("google");
  if (hasTelegram) methods.push("telegram");
  if (hasRealPhone) methods.push("phone");
  if (hasPassword || methods.length === 0) methods.push("password");

  return {
    methods,
    primaryMethod: methods[0],
    canResetPassword: hasPassword
  };
}

export function signInMethodLabel(method: SignInMethod): string {
  switch (method) {
    case "google":
      return "Google";
    case "telegram":
      return "Telegram";
    case "phone":
      return "Телефон";
    case "password":
      return "Email/пароль";
  }
}
