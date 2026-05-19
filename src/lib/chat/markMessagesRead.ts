import { prisma } from "@/lib/prisma";

/** Mark peer messages as read when the user opens the booking chat. */
export async function markBookingChatMessagesRead(bookingId: number, readerUserId: number): Promise<number> {
  const now = new Date();
  const result = await prisma.chatMessage.updateMany({
    where: {
      bookingId,
      senderId: { not: readerUserId },
      readAt: null,
      deletedAt: null,
      isArchived: false
    },
    data: {
      status: "READ",
      readAt: now
    }
  });
  return result.count;
}
