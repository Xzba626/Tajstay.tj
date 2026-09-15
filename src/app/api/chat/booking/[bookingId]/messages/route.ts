import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getAdminBookingChatTimeline, getArchivedBookingChatMessages, getBookingChatMessages } from "@/lib/chat/bookingChat";
import { markBookingChatMessagesRead } from "@/lib/chat/markMessagesRead";
import { isBookingChatLocked } from "@/lib/chat/chatLock";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { saveChatAttachmentFile } from "@/lib/uploads/saveChatAttachment";
import { canAccessBookingChat } from "@/lib/chat/bookingAccess";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { authorizeBookingAccess } from "@/lib/pms/bookingAuthorization";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

/** Chat attachments are stored privately (see saveChatAttachment.ts) - never return the raw
 * pathname to a client; only the authenticated proxy route may resolve it to bytes. */
function chatImageProxyUrl(bookingId: number, messageId: number): string {
  return `/api/files/booking/${bookingId}/chat/${messageId}`;
}

function toClientMessages<T extends { id: number; imageUrl: string | null }>(
  bookingId: number,
  messages: T[]
): T[] {
  return messages.map((m) => (m.imageUrl ? { ...m, imageUrl: chatImageProxyUrl(bookingId, m.id) } : m));
}

function bookingChatSnapshot(b: {
  status: string;
  paymentStatus: string;
  expiresAt: Date | null;
  proofReviewDeadlineAt: Date | null;
  paymentTimerPaused: boolean;
  chatArchivedAt: Date | null;
}) {
  return {
    status: b.status,
    paymentStatus: b.paymentStatus,
    expiresAt: b.expiresAt?.toISOString() ?? null,
    proofReviewDeadlineAt: b.proofReviewDeadlineAt?.toISOString() ?? null,
    paymentTimerPaused: b.paymentTimerPaused,
    chatArchivedAt: b.chatArchivedAt?.toISOString() ?? null
  };
}

async function ensureAccess(bookingId: number, userId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ...bookingWithHotelInclude, user: true }
  });
  if (!booking) return null;
  const roleRow = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!roleRow || !canAccessBookingChat(booking, { id: userId, role: roleRow.role })) return null;
  return booking;
}

export async function GET(_: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const booking = await ensureAccess(bookingId, user.id);
  if (!booking) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hasOpenDispute = Boolean(
    await prisma.dispute.findFirst({ where: { bookingId, status: "OPEN" }, select: { id: true } })
  );
  const locked = isBookingChatLocked(booking, hasOpenDispute);
  const archivedFlag = Boolean(booking.chatArchivedAt);

  await markBookingChatMessagesRead(bookingId, user.id);

  // BLOCK 5.6D — cold-archive history is readable by the original guest/owner/admin (accepted
  // Option B): archived rows have `isArchived: true`, which `getBookingChatMessages` filters OUT,
  // so a dedicated read path is needed rather than the previous "return an empty list to
  // non-admins" behavior. `canSend` below still reflects `locked`, which is unconditionally true
  // once archived - this is read-only history, not a reactivated conversation.
  let messages = archivedFlag
    ? await getArchivedBookingChatMessages(bookingId, 500)
    : user.role === "ADMIN" && locked
      ? await getAdminBookingChatTimeline(bookingId, 500)
      : await getBookingChatMessages(bookingId, 200);

  if (user.role === "OWNER" && (booking.status === BOOKING_STATUS.WAITING_PAYMENT || booking.status === BOOKING_STATUS.WAIT_PROOF)) {
    messages = messages.filter((m) => m.senderRole === "SYSTEM");
  }

  const canSend = !locked;
  return NextResponse.json(
    {
      ok: true,
      messages: toClientMessages(bookingId, messages),
      chatArchived: archivedFlag,
      canSend,
      booking: bookingChatSnapshot(booking)
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { include: { hotel: true } } }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBookingChat(booking, user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const isGuest = booking.userId != null && booking.userId === user.id;
  const isOwner = bookingHotel(booking).ownerId === user.id;
  const isAdmin = user.role === "ADMIN";

  const hasOpenDisputeForPost = Boolean(
    await prisma.dispute.findFirst({ where: { bookingId, status: "OPEN" }, select: { id: true } })
  );
  if (isBookingChatLocked(booking, hasOpenDisputeForPost)) {
    return NextResponse.json({ error: "Чат закрыт для новых сообщений" }, { status: 403 });
  }

  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  let message = "";
  let imageFile: File | null = null;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    message = String(form.get("message") ?? "").trim();
    const f = form.get("file");
    imageFile = f instanceof File && f.size > 0 ? f : null;
  } else {
    const body = (await req.json().catch(() => ({}))) as { message?: unknown };
    message = String(body?.message ?? "").trim();
  }

  let imageUrl: string | null = null;
  if (imageFile) {
    imageUrl = await saveChatAttachmentFile(imageFile, bookingId);
    if (!imageUrl) return NextResponse.json({ error: "Некорректный файл вложения" }, { status: 400 });
  }

  if (!message && !imageUrl) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const proofReviewDeadlineAt = new Date(Date.now() + 5 * 60 * 1000);
  const proofFromGuestStatuses = [BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.WAIT_PROOF] as const;

  let proofJustSubmitted = false;
  await prisma.$transaction(async (tx) => {
    if (isGuest && imageUrl) {
      const transitioned = await tx.booking.updateMany({
        where: {
          id: bookingId,
          status: { in: [...proofFromGuestStatuses] }
        },
        data: {
          status: BOOKING_STATUS.ON_REVIEW,
          paymentProofUrl: imageUrl,
          proofSubmittedAt: new Date(),
          proofReviewDeadlineAt,
          paymentTimerPaused: true,
          expiresAt: null
        }
      });
      proofJustSubmitted = transitioned.count > 0;
    }

    await tx.chatMessage.create({
      data: {
        bookingId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
        body: message || (imageUrl ? "📎" : ""),
        imageUrl,
        isArchived: false,
        deletedAt: null
      }
    });

    if (proofJustSubmitted) {
      await tx.notification.create({
        data: {
          userId: bookingHotel(booking).ownerId,
          bookingId,
          type: "PAYMENT_PROOF_SUBMITTED",
          isRead: false
        }
      });
      await tx.chatMessage.create({
        data: {
          bookingId,
          senderId: 0,
          senderRole: "SYSTEM",
          senderName: "System",
          body: "🛡️ Система: Чек получен. Отведено 5 минут на проверку администратором и владельцем.",
          imageUrl: null,
          isArchived: false,
          deletedAt: null,
          // BLOCK 5.6D: this writer stays inline (inside the same $transaction as the guest's own
          // message + booking-status transition) rather than calling addBookingSystemEvent(), which
          // is not itself transaction-aware — but it now populates the same eventType/eventPayload
          // fields so it renders identically to every other semantic system event.
          eventType: "proof.received",
          eventPayload: JSON.stringify({ reviewMinutes: 5 })
        }
      });
    }
  });

  const adminRow = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true }
  });
  const ownerId = bookingHotel(booking).ownerId;
  const targets = [booking.userId, ownerId, adminRow?.id].filter((v): v is number => typeof v === "number");
  const receivers = targets.filter((uid) => uid !== user.id);
  if (receivers.length) {
    await prisma.notification.createMany({
      data: receivers.map((userId) => ({
        userId,
        bookingId: booking.id,
        type: "BOOKING_CHAT_NEW",
        isRead: false
      }))
    });
  }

  const finalBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { include: { hotel: true } } }
  });
  if (!finalBooking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const locked = isBookingChatLocked(finalBooking, hasOpenDisputeForPost);
  let messages = await getBookingChatMessages(bookingId, 200);
  if (
    user.role === "OWNER" &&
    (finalBooking.status === BOOKING_STATUS.WAITING_PAYMENT || finalBooking.status === BOOKING_STATUS.WAIT_PROOF)
  ) {
    messages = messages.filter((m) => m.senderRole === "SYSTEM");
  }
  return NextResponse.json(
    {
      ok: true,
      messages: toClientMessages(bookingId, messages),
      chatArchived: Boolean(finalBooking.chatArchivedAt),
      canSend: !locked,
      booking: bookingChatSnapshot(finalBooking)
    },
    { status: 200 }
  );
}
