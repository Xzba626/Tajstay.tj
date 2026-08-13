import { prisma } from "@/lib/prisma";
import { sendWebPushToUser } from "@/lib/push/sendWebPush";

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
  void sendWebPushToUser(input.userId, {
    title: input.title?.trim() || "Tajstay",
    body: input.message?.trim() || input.type,
    url: input.link || "/notifications",
    tag: `n-${note.id}`
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
