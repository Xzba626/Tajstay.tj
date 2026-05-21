import type { User } from "@prisma/client";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";

export type TrustBadgeKey = "phoneVerified" | "emailVerified" | "ownerVerified";

export type TrustBadge = {
  key: TrustBadgeKey;
  i18nKey: string;
};

export function getUserTrustBadges(user: Pick<User, "phone" | "phoneVerified" | "email" | "emailVerified" | "role" | "verified">): TrustBadge[] {
  const badges: TrustBadge[] = [];
  const hasRealPhone = Boolean(user.phone?.trim() && !isPlaceholderAccountPhone(user.phone));

  if (user.phoneVerified && hasRealPhone) {
    badges.push({ key: "phoneVerified", i18nKey: "trust.phoneVerified" });
  }
  if (user.emailVerified || (user.email?.trim() && user.verified)) {
    badges.push({ key: "emailVerified", i18nKey: "trust.emailVerified" });
  }
  if (user.role === "OWNER") {
    badges.push({ key: "ownerVerified", i18nKey: "trust.ownerVerified" });
  }
  return badges;
}
