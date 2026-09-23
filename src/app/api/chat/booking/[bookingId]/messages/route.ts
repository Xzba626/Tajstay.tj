import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getAdminBookingChatTimeline, getArchivedBookingChatMessages, getBookingChatMessages } from "@/lib/chat/bookingChat";
import { markBookingChatMessagesRead } from "@/lib/chat/markMessagesRead";
import { isBookingChatLocked } from "@/lib/chat/chatLock";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { saveChatAttachmentFile } from "@/lib/uploads/saveChatAttachment";
import { canAccessBookingChatAsync } from "@/lib/chat/bookingAccess";
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
  if (!roleRow || !(await canAccessBookingChatAsync(booking, { id: userId, role: roleRow.role }))) return null;
  return booking;
}

export async function GET(_: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  try {
    return await readBookingChat(bookingId, user);
  } catch (e) {
    // Previously unguarded: any DB error here became Next's HTML 500, which the client can only
    // render as the generic "Сервер временно недоступен". The client polls this route every few
    // seconds, so a single transient DB failure surfaced as a send-looking error banner.
    console.error("[chat.messages.GET] read failed", {
      bookingId,
      userId: user.id,
      role: user.role,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e)
    });
    return NextResponse.json({ error: "read_failed" }, { status: 503 });
  }
}

async function readBookingChat(bookingId: number, user: { id: number; role: string }) {
  const booking = await ensureAccess(bookingId, user.id);
  if (!booking) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hasOpenDispute = Boolean(
    await prisma.dispute.findFirst({ where: { bookingId, status: "OPEN" }, select: { id: true } })
  );
  const locked = isBookingChatLocked(booking, hasOpenDispute);
  const archivedFlag = Boolean(booking.chatArchivedAt);

  try {
    await markBookingChatMessagesRead(bookingId, user.id);
  } catch (e) {
    // Read receipts are best-effort; never fail the history read because of them.
    console.error("[chat.messages.GET] mark-read failed", {
      bookingId,
      userId: user.id,
      error: e instanceof Error ? e.message : String(e)
    });
  }

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

export async function POST(req: NextRequest, ctx: { params: { bookingId: string } }) {
  try {
    return await handlePost(req, ctx);
  } catch (e) {
    // Last-resort guard for the pre-write stages (auth, booking lookup, access, dispute check,
    // attachment save). Nothing was persisted if we get here, so a retry is safe.
    console.error("[chat.messages.POST] pre-write stage failed", {
      bookingId: ctx.params?.bookingId,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e)
    });
    return NextResponse.json({ error: "send_failed" }, { status: 503 });
  }
}

async function handlePost(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
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

  if (!(await canAccessBookingChatAsync(booking, user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Forensic finding (Consumer Mobile Corrective Pass): everything from here to the end of the
  // handler used to run unguarded. An exception ANYWHERE in this tail - the write itself, the
  // best-effort notification fan-out, or the post-send re-fetch used to build the response -
  // surfaced as the exact same opaque 500 ("Сервер временно недоступен"), with nothing logged
  // server-side to tell a genuine write failure apart from "the message saved fine but a
  // downstream step then threw". Isolating each stage and logging every failure point fixes that
  // without changing the client-visible contract on the success path, and without guessing at an
  // unproven cause (Vercel sleep, SSE, etc.) - see the reported error's actual first bad boundary.
  let proofJustSubmitted = false;
  try {
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
  } catch (e) {
    console.error("[chat.messages.POST] message write failed", {
      bookingId,
      userId: user.id,
      role: user.role,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e)
    });
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  // Best-effort fan-out: the guest/owner/admin message was already durably saved above. A
  // notification failure (FK edge case, transient DB hiccup) must never make the client believe
  // the send itself failed.
  try {
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
  } catch (e) {
    console.error("[chat.messages.POST] notification side-effect failed (message already saved)", {
      bookingId,
      userId: user.id,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e)
    });
  }

  try {
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
  } catch (e) {
    // The message is already safely persisted at this point (the write above succeeded) - this
    // is only the response-rebuild step failing. Logged distinctly from a real write failure so
    // production logs don't conflate "nothing was saved" with "it was saved, replying failed".
    console.error("[chat.messages.POST] response rebuild failed after successful save", {
      bookingId,
      userId: user.id,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e)
    });
    // The message IS committed. Returning 500 here told the user "not sent" and invited a retry
    // that created a duplicate. Report success; the client re-pulls history on `saved`.
    return NextResponse.json({ ok: true, saved: true }, { status: 200 });
  }
}
