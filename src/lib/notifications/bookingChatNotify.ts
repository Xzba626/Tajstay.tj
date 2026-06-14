import { prisma } from "@/lib/prisma";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { createNotification } from "@/lib/notifications/create";
import { triggerUserNotifyEvent } from "@/lib/pusher/server";

async function globalAdminId(): Promise<number | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true }
  });
  return admin?.id ?? null;
}

async function moderatorUserIdsForHotel(hotelId: number): Promise<number[]> {
  const rows = await prisma.hotelModerator.findMany({
    where: { hotelId },
    select: { userId: true }
  });
  return rows.map((r) => r.userId);
}

export async function notifyBookingChatMessage(params: {
  bookingId: number;
  senderUserId: number;
  senderName: string | null;
  messagePreview: string;
}): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: bookingWithHotelInclude
  });
  if (!booking) return;

  let ownerId: number;
  let hotelId: number;
  try {
    const hotel = bookingHotel(booking);
    ownerId = hotel.ownerId;
    hotelId = hotel.id;
  } catch {
    return;
  }

  const adminId = await globalAdminId();
  const moderatorIds = await moderatorUserIdsForHotel(hotelId);
  const receiverIds = new Set<number>([ownerId, ...moderatorIds]);
  if (booking.userId) receiverIds.add(booking.userId);
  if (adminId) receiverIds.add(adminId);
  receiverIds.delete(params.senderUserId);

  const preview = (params.messagePreview || "Новое сообщение").trim().slice(0, 160);
  const sender = params.senderName?.trim() || "Сообщение";
  const title = "Новое сообщение в чате";
  const url = `/chat/booking/${params.bookingId}`;

  await Promise.all(
    [...receiverIds].map(async (userId) => {
      await createNotification({
        userId,
        type: "BOOKING_CHAT_NEW",
        bookingId: params.bookingId,
        title,
        message: `${sender}: ${preview}`,
        link: url
      });
      await triggerUserNotifyEvent(userId, {
        kind: "chat",
        bookingId: params.bookingId,
        title,
        body: `${sender}: ${preview}`,
        url,
        senderUserId: params.senderUserId
      });
    })
  );
}

export async function notifyNewBookingRequest(params: {
  bookingId: number;
  ownerId: number;
  hotelId: number;
  hotelName: string;
  guestLabel: string;
}): Promise<void> {
  const moderatorIds = await moderatorUserIdsForHotel(params.hotelId);
  const receiverIds = new Set<number>([params.ownerId, ...moderatorIds]);
  const title = "Новая заявка на бронирование";
  const body = `${params.guestLabel} · ${params.hotelName}`;
  const url = `/dashboard/owner?section=bookings`;

  await Promise.all(
    [...receiverIds].map(async (userId) => {
      await createNotification({
        userId,
        type: "NEW_BOOKING",
        bookingId: params.bookingId,
        title,
        message: body,
        link: userId === params.ownerId ? url : `/dashboard/moderator?section=bookings`
      });
      await triggerUserNotifyEvent(userId, {
        kind: "booking",
        bookingId: params.bookingId,
        title,
        body,
        url: userId === params.ownerId ? url : `/dashboard/moderator?section=bookings`
      });
    })
  );
}
