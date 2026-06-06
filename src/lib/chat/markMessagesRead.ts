import { prisma } from "@/lib/prisma";
import { triggerBookingChatEvent } from "@/lib/pusher/server";
import { PUSHER_EVENTS } from "@/lib/pusher/config";

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

  if (result.count > 0) {
    await triggerBookingChatEvent(bookingId, PUSHER_EVENTS.MESSAGE_READ, {
      readerUserId,
      readAt: now.toISOString()
    });
  }

  return result.count;
}
