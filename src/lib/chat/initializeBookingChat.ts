import { prisma } from "@/lib/prisma";
import { addBookingSystemMessage, BOOKING_CHAT_LOG_TYPE } from "@/lib/chat/bookingChat";
import { buildChatInitWelcome } from "@/lib/chat/initWelcomeMessage";

async function globalAdminId(): Promise<number | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true }
  });
  return admin?.id ?? null;
}

import { bookingHotel } from "@/lib/pms/bookingContext";

const bookingInclude = {
  room: { include: { hotel: true } },
  roomType: { include: { hotel: true } },
  assignedRoom: { include: { hotel: true } },
  user: true
} as const;

export type InitBookingChatResult =
  | { ok: true; ownerId: number; adminId: number; alreadyInitialized: boolean }
  | { ok: false; reason: string };

/**
 * Создаёт приветствие и уведомления для трёхстороннего чата по брони.
 * Вызывается с сервера после успешного создания брони и из POST /api/chat/.../init.
 */
export async function initializeBookingChatRoom(bookingId: number, locale?: string): Promise<InitBookingChatResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude
  });
  if (!booking) return { ok: false, reason: "not_found" };
  if (!booking.userId) return { ok: false, reason: "offline_no_chat" };

  const adminId = await globalAdminId();
  if (!adminId) return { ok: false, reason: "no_admin" };

  const ownerId = bookingHotel(booking).ownerId;

  const legacyCount = await prisma.transactionLog.count({
    where: { bookingId, type: BOOKING_CHAT_LOG_TYPE }
  });
  const msgCount = await prisma.chatMessage.count({
    where: { bookingId, deletedAt: null, isArchived: false }
  });
  if (legacyCount > 0 || msgCount > 0) {
    return { ok: true, ownerId, adminId, alreadyInitialized: true };
  }

  const welcome = buildChatInitWelcome(locale, booking);
  await addBookingSystemMessage({ bookingId, message: welcome });

  await prisma.notification.createMany({
    data: [
      { userId: ownerId, bookingId, type: "BOOKING_CHAT_CREATED", isRead: false },
      { userId: adminId, bookingId, type: "BOOKING_CHAT_CREATED", isRead: false }
    ]
  });

  return { ok: true, ownerId, adminId, alreadyInitialized: false };
}
