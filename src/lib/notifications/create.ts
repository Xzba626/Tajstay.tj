import { prisma } from "@/lib/prisma";

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
  return prisma.notification.create({
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
