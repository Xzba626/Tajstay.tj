import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";

export type InboxFilter = "all" | "unread" | "payment_pending" | "on_review" | "confirmed";

export type InboxConversation = {
  bookingId: number;
  publicCode: string | null;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  hotelName: string;
  roomTitle: string;
  coverImageUrl: string | null;
  guestLabel: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

function statusMatchesFilter(status: string, filter: InboxFilter): boolean {
  if (filter === "all" || filter === "unread") return true;
  if (filter === "payment_pending") {
    return status === BOOKING_STATUS.WAITING_PAYMENT || status === BOOKING_STATUS.WAIT_PROOF;
  }
  if (filter === "on_review") return status === BOOKING_STATUS.ON_REVIEW;
  if (filter === "confirmed") {
    return (
      status === BOOKING_STATUS.CONFIRMED ||
      status === BOOKING_STATUS.CHECKED_IN ||
      status === BOOKING_STATUS.COMPLETED
    );
  }
  return true;
}

export async function getInboxConversations(params: {
  userId: number;
  role: string;
  filter: InboxFilter;
  take?: number;
}): Promise<InboxConversation[]> {
  const { userId, role, filter, take = 50 } = params;

  const where =
    role === "OWNER"
      ? { room: { hotel: { ownerId: userId } } }
      : role === "ADMIN"
        ? {}
        : { userId };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      room: { include: { hotel: true } },
      user: { select: { name: true, phone: true } },
      chatMessages: {
        where: { deletedAt: null, isArchived: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderRole: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 120
  });

  const bookingIds = bookings.map((b) => b.id);
  const unreadRows =
    bookingIds.length > 0
      ? await prisma.chatMessage.groupBy({
          by: ["bookingId"],
          where: {
            bookingId: { in: bookingIds },
            senderId: { not: userId },
            readAt: null,
            deletedAt: null,
            isArchived: false
          },
          _count: { _all: true }
        })
      : [];

  const unreadByBooking = new Map(unreadRows.map((r) => [r.bookingId, r._count._all]));

  const rows: InboxConversation[] = [];

  for (const b of bookings) {
    if (!statusMatchesFilter(b.status, filter)) continue;
    const unreadCount = unreadByBooking.get(b.id) ?? 0;
    if (filter === "unread" && unreadCount === 0) continue;

    const last = b.chatMessages[0];
    const guestLabel = b.guestName?.trim() || b.user?.name?.trim() || b.guestPhone?.trim() || b.phone || "—";

    rows.push({
      bookingId: b.id,
      publicCode: b.publicCode,
      status: b.status,
      paymentStatus: b.paymentStatus,
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString(),
      hotelName: b.room.hotel.name,
      roomTitle: b.room.title,
      coverImageUrl: b.room.hotel.coverImageUrl,
      guestLabel,
      lastMessage: last?.body?.trim() || "",
      lastMessageAt: last?.createdAt?.toISOString() ?? null,
      unreadCount
    });
  }

  return rows
    .sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, take);
}
