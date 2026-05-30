import type { User } from "@prisma/client";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";

export type VerificationItem = {
  id: "phone" | "email" | "telegram" | "photo";
  done: boolean;
};

export function getProfileVerification(user: Pick<
  User,
  "phone" | "phoneVerified" | "email" | "emailVerified" | "telegramId" | "telegramUsername" | "image" | "telegramPhotoUrl"
>): VerificationItem[] {
  const hasPhone = Boolean(user.phone?.trim() && !isPlaceholderAccountPhone(user.phone));
  const emailOk = Boolean(user.emailVerified || (user.email?.trim() && user.emailVerified));
  const hasEmail = Boolean(user.email?.trim());

  return [
    { id: "phone", done: hasPhone && user.phoneVerified },
    { id: "email", done: hasEmail && Boolean(user.emailVerified) },
    { id: "telegram", done: Boolean(user.telegramId || user.telegramUsername) },
    { id: "photo", done: Boolean(user.image || user.telegramPhotoUrl) }
  ];
}

export function getProfileTrustPercent(user: Parameters<typeof getProfileVerification>[0]): number {
  const items = getProfileVerification(user);
  const weights = { phone: 30, email: 25, telegram: 20, photo: 15 } as const;
  let score = 10; // base for having an account
  for (const item of items) {
    if (item.done && item.id in weights) {
      score += weights[item.id as keyof typeof weights];
    }
  }
  return Math.min(100, score);
}
