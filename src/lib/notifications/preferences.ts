import { prisma } from "@/lib/prisma";

/**
 * MASTER COMPLETION BLOCK, PHASE B — classifies every real notification `type` string already
 * used in this codebase (grepped, not guessed) into the two categories that have a genuine,
 * pre-existing sending code path. Anything not matched defaults to "bookingUpdates" rather than
 * silently going unsent — a missed classification should degrade to "still sent", never to
 * "silently dropped".
 */
const SECURITY_TYPES = new Set([
  "AUTH_NEW_LOGIN",
  "AUTH_PHONE_VERIFIED",
  "AUTH_SUSPICIOUS_LOGIN",
  "SECURITY_PASSWORD_CHANGED",
  "SECURITY_PASSWORD_RESET_ISSUED"
]);

export function notificationCategory(type: string): "security" | "bookingUpdates" {
  return SECURITY_TYPES.has(type) ? "security" : "bookingUpdates";
}

export async function getNotificationPreference(userId: number) {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  return {
    security: pref?.security ?? true,
    bookingUpdates: pref?.bookingUpdates ?? true
  };
}

/** Whether a push notification of this type should actually be sent to this user. The in-app
 * Notification row is ALWAYS created regardless (see createNotification) — this only gates the
 * push delivery, so a user can never fully hide security-relevant history from their own inbox
 * by turning off push alerts for that category. */
export async function isPushAllowed(userId: number, type: string): Promise<boolean> {
  const pref = await getNotificationPreference(userId);
  return pref[notificationCategory(type)];
}
