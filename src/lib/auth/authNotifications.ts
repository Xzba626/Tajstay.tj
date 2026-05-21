import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/create";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

const LOGIN_EVENTS = ["login_firebase", "login_phone", "login_password"] as const;

async function hadRecentLoginFromOtherIp(userId: number, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const other = await prisma.authAuditLog.findFirst({
    where: {
      userId,
      event: { in: [...LOGIN_EVENTS] },
      ip: { not: ip },
      createdAt: { gte: since }
    },
    select: { id: true }
  });
  return Boolean(other);
}

/** In-app + push after successful sign-in (not first-time registration). */
export async function notifyAuthLogin(params: {
  userId: number;
  ip?: string;
  isNewAccount?: boolean;
}): Promise<void> {
  if (params.isNewAccount) return;

  const locale = getLocale();
  const ip = params.ip?.trim() || "";
  const suspicious = ip ? await hadRecentLoginFromOtherIp(params.userId, ip) : false;

  if (suspicious) {
    await createNotification({
      userId: params.userId,
      type: "AUTH_SUSPICIOUS_LOGIN",
      title: m(locale, "notifications.AUTH_SUSPICIOUS_LOGIN"),
      message: m(locale, "notifications.authSuspiciousBody"),
      link: "/profile"
    });
    return;
  }

  await createNotification({
    userId: params.userId,
    type: "AUTH_NEW_LOGIN",
    title: m(locale, "notifications.AUTH_NEW_LOGIN"),
    message: m(locale, "notifications.authNewLoginBody"),
    link: "/profile"
  });
}

export async function notifyPhoneVerified(userId: number): Promise<void> {
  const locale = getLocale();
  await createNotification({
    userId,
    type: "AUTH_PHONE_VERIFIED",
    title: m(locale, "notifications.AUTH_PHONE_VERIFIED"),
    message: m(locale, "notifications.authPhoneVerifiedBody"),
    link: "/profile"
  });
}
