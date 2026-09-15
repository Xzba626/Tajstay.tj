import { prisma } from "@/lib/prisma";
import { sendWebPushToUser } from "@/lib/push/sendWebPush";
import { isPushAllowed } from "@/lib/notifications/preferences";

export type CreateNotificationInput = {
  userId: number;
  type: string;
  bookingId?: number | null;
  title?: string | null;
  message?: string | null;
  link?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function createNotification(input: CreateNotificationInput) {
  const note = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      bookingId: input.bookingId ?? undefined,
      title: input.title ?? undefined,
      message: input.message ?? undefined,
      link: input.link ?? undefined,
      meta: input.meta ? JSON.stringify(input.meta) : undefined
    }
  });
  // The Notification row above is always created — push is the only thing a category
  // preference can suppress (see src/lib/notifications/preferences.ts for why).
  void isPushAllowed(input.userId, input.type).then((allowed) => {
    if (!allowed) return;
    return sendWebPushToUser(input.userId, {
      title: input.title?.trim() || "Tajstay",
      body: input.message?.trim() || input.type,
      url: input.link || "/notifications",
      tag: `n-${note.id}`
    });
  }).catch(() => undefined);
  return note;
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (!inputs.length) return { count: 0 };
  return prisma.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      bookingId: input.bookingId ?? undefined,
      title: input.title ?? undefined,
      message: input.message ?? undefined,
      link: input.link ?? undefined,
      meta: input.meta ? JSON.stringify(input.meta) : undefined
    }))
  });
}
