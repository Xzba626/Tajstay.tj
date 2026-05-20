import { prisma } from "@/lib/prisma";

/** Sends web push when VAPID keys are configured (optional). */
export async function sendWebPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string }
) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@tajstay.tj";
  if (!publicKey || !privateKey) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;

  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        },
        body
      )
    )
  );
}
