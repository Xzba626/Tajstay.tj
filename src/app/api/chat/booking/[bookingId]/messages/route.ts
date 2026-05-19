import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getAdminBookingChatTimeline, getBookingChatMessages } from "@/lib/chat/bookingChat";
import { markBookingChatMessagesRead } from "@/lib/chat/markMessagesRead";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { saveChatAttachmentFile } from "@/lib/uploads/saveChatAttachment";

const TERMINAL_NO_NEW_MESSAGES = new Set<string>([
  BOOKING_STATUS.EXPIRED,
  BOOKING_STATUS.CANCELLED,
  "CANCELLED_BY_GUEST",
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.COMPLETED
]);

function isBookingChatLocked(booking: { chatArchivedAt: Date | null; status: string }): boolean {
  if (booking.chatArchivedAt) return true;
  return TERMINAL_NO_NEW_MESSAGES.has(booking.status);
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
    include: { room: { include: { hotel: true } }, user: true }
  });
  if (!booking) return null;
  const isGuest = booking.userId === userId;
  const isOwner = booking.room.hotel.ownerId === userId;
  const isAdmin = (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "ADMIN";
  if (!isGuest && !isOwner && !isAdmin) return null;
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

  const locked = isBookingChatLocked(booking);
  const archivedFlag = Boolean(booking.chatArchivedAt);

  if (archivedFlag && user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: true, messages: [], chatArchived: true, canSend: false },
      { status: 200 }
    );
  }

  await markBookingChatMessagesRead(bookingId, user.id);

  let messages =
    user.role === "ADMIN" && (archivedFlag || locked)
      ? await getAdminBookingChatTimeline(bookingId, 500)
      : await getBookingChatMessages(bookingId, 200);

  if (user.role === "OWNER" && (booking.status === BOOKING_STATUS.WAITING_PAYMENT || booking.status === BOOKING_STATUS.WAIT_PROOF)) {
    messages = messages.filter((m) => m.senderRole === "SYSTEM");
  }

  const canSend = !locked;
  return NextResponse.json(
    { ok: true, messages, chatArchived: archivedFlag, canSend, booking: bookingChatSnapshot(booking) },
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

  const isGuest = booking.userId === user.id;
  const isOwner = booking.room.hotel.ownerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isGuest && !isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isBookingChatLocked(booking)) {
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
          userId: booking.room.hotel.ownerId,
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
          deletedAt: null
        }
      });
    }
  });

  const adminRow = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true }
  });
  const ownerId = booking.room.hotel.ownerId;
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

  const locked = isBookingChatLocked(finalBooking);
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
      messages,
      chatArchived: Boolean(finalBooking.chatArchivedAt),
      canSend: !locked,
      booking: bookingChatSnapshot(finalBooking)
    },
    { status: 200 }
  );
}
