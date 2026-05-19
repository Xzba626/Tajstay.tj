import { prisma } from "@/lib/prisma";
import { syntheticArchiveChatMessageId } from "@/lib/chat/archiveMessageIds";
import { deletePublicUploadUrl } from "@/lib/uploads/deletePublicUpload";

export const BOOKING_CHAT_LOG_TYPE = "BOOKING_CHAT_MESSAGE";

export type BookingChatMessage = {
  id: number;
  bookingId: number;
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
};

export type ArchivedExportRow = {
  id: number;
  source: "chat_message" | "legacy_archive";
  senderId: number;
  senderRole: string;
  senderName: string;
  body: string;
  imageUrl: string | null;
  originalCreatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
};

function parseChatPayload(payload: string | null): {
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl?: string | null;
} | null {
  if (!payload) return null;
  try {
    const data = JSON.parse(payload) as Partial<{
      senderId: number;
      senderRole: string;
      senderName: string;
      message: string;
      imageUrl?: string | null;
    }>;
    if (!data || typeof data.senderId !== "number" || typeof data.message !== "string") return null;
    return {
      senderId: data.senderId,
      senderRole: String(data.senderRole ?? "GUEST"),
      senderName: String(data.senderName ?? "User"),
      message: data.message,
      imageUrl: data.imageUrl ?? null
    };
  } catch {
    return null;
  }
}

function rowToDto(
  bookingId: number,
  row: {
    id: number;
    body: string;
    imageUrl: string | null;
    createdAt: Date;
    senderId: number;
    senderRole: string;
    senderName: string;
    status: string;
    readAt: Date | null;
  }
): BookingChatMessage {
  return {
    id: row.id,
    bookingId,
    senderId: row.senderId,
    senderRole: row.senderRole,
    senderName: row.senderName,
    message: row.body,
    imageUrl: row.imageUrl,
    status: row.status,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

/** Переносит старые записи TransactionLog в ChatMessage и удаляет логи. */
export async function migrateLegacyBookingChatLogs(bookingId: number): Promise<void> {
  const legacy = await prisma.transactionLog.findMany({
    where: { bookingId, type: BOOKING_CHAT_LOG_TYPE },
    orderBy: { createdAt: "asc" }
  });
  if (!legacy.length) return;

  for (const row of legacy) {
    const exists = await prisma.chatMessage.findFirst({ where: { legacyLogId: row.id } });
    if (exists) continue;
    const p = parseChatPayload(row.payload);
    if (!p) continue;
    await prisma.chatMessage.create({
      data: {
        bookingId,
        senderId: p.senderId,
        senderRole: p.senderRole,
        senderName: p.senderName,
        body: p.message,
        imageUrl: p.imageUrl ?? null,
        legacyLogId: row.id,
        createdAt: row.createdAt,
        isArchived: false,
        deletedAt: null
      }
    });
  }

  await prisma.transactionLog.deleteMany({
    where: { bookingId, type: BOOKING_CHAT_LOG_TYPE }
  });
}

export async function getBookingChatMessages(bookingId: number, take = 200): Promise<BookingChatMessage[]> {
  await migrateLegacyBookingChatLogs(bookingId);
  const rows = await prisma.chatMessage.findMany({
    where: { bookingId, deletedAt: null, isArchived: false },
    orderBy: { createdAt: "asc" },
    take
  });
  return rows.map((r) => rowToDto(bookingId, r));
}

/** Полная лента для админа: все записи ChatMessage (в т.ч. архив/soft-delete) + legacy ChatArchive. */
export async function getAdminBookingChatTimeline(bookingId: number, take = 500): Promise<BookingChatMessage[]> {
  await migrateLegacyBookingChatLogs(bookingId);
  const live = await prisma.chatMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    take
  });
  const archived = await prisma.chatArchive.findMany({
    where: { bookingId },
    orderBy: { originalCreatedAt: "asc" }
  });

  const fromLive = live.map((r) => rowToDto(bookingId, r));
  const fromArch: BookingChatMessage[] = archived.map((r) => ({
    id: syntheticArchiveChatMessageId(r.id),
    bookingId,
    senderId: r.senderId,
    senderRole: r.senderRole,
    senderName: r.senderName,
    message: r.body,
    imageUrl: r.imageUrl,
    status: "READ",
    readAt: r.archivedAt.toISOString(),
    createdAt: r.originalCreatedAt.toISOString()
  }));

  return [...fromLive, ...fromArch].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function addBookingChatMessage(input: {
  bookingId: number;
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl?: string | null;
}) {
  const text = input.message.trim();
  const img = input.imageUrl?.trim() || null;
  if (!text && !img) throw new Error("message_required");
  if (text.length > 1500) throw new Error("message_too_long");

  await prisma.chatMessage.create({
    data: {
      bookingId: input.bookingId,
      senderId: input.senderId,
      senderRole: input.senderRole,
      senderName: input.senderName,
      body: text,
      imageUrl: img,
      isArchived: false,
      deletedAt: null
    }
  });
}

export async function addBookingSystemMessage(input: { bookingId: number; message: string }) {
  const text = input.message.trim();
  if (!text) return;
  await prisma.chatMessage.create({
    data: {
      bookingId: input.bookingId,
      senderId: 0,
      senderRole: "SYSTEM",
      senderName: "System",
      body: text,
      imageUrl: null,
      isArchived: false,
      deletedAt: null
    }
  });
}

/** Мягкое скрытие сообщения (админ): остаётся в БД для споров. */
export async function deleteChatMessageById(messageId: number): Promise<{ ok: boolean; imageUrl: string | null }> {
  const row = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!row) return { ok: false, imageUrl: null };
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() }
  });
  return { ok: true, imageUrl: null };
}

/** Владелец скрывает всю переписку из UI (мягко, записи остаются). */
export async function ownerSoftDeleteBookingChat(bookingId: number, ownerUserId: number): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { include: { hotel: true } } }
  });
  if (!booking || booking.room.hotel.ownerId !== ownerUserId) return false;
  await prisma.chatMessage.updateMany({
    where: { bookingId },
    data: { deletedAt: new Date() }
  });
  return true;
}

/** Удаляет только активные сообщения и вложения (архив не трогает). */
export async function purgeActiveBookingChatOnly(bookingId: number): Promise<{ deletedFiles: number }> {
  const rows = await prisma.chatMessage.findMany({
    where: { bookingId },
    select: { imageUrl: true }
  });
  let deletedFiles = 0;
  for (const r of rows) {
    if (r.imageUrl && (await deletePublicUploadUrl(r.imageUrl))) deletedFiles += 1;
  }
  await prisma.chatMessage.deleteMany({ where: { bookingId } });
  await prisma.transactionLog.deleteMany({ where: { bookingId, type: BOOKING_CHAT_LOG_TYPE } });
  return { deletedFiles };
}

/** Полная очистка чата: активные + архив + файлы на диске (админ). */
export async function adminPurgeBookingChatCompletely(bookingId: number): Promise<{ deletedFiles: number }> {
  const active = await prisma.chatMessage.findMany({ where: { bookingId }, select: { imageUrl: true } });
  const arch = await prisma.chatArchive.findMany({ where: { bookingId }, select: { imageUrl: true } });
  let deletedFiles = 0;
  for (const r of [...active, ...arch]) {
    if (r.imageUrl && (await deletePublicUploadUrl(r.imageUrl))) deletedFiles += 1;
  }
  await prisma.chatMessage.deleteMany({ where: { bookingId } });
  await prisma.chatArchive.deleteMany({ where: { bookingId } });
  await prisma.transactionLog.deleteMany({ where: { bookingId, type: BOOKING_CHAT_LOG_TYPE } });
  await prisma.booking.update({
    where: { id: bookingId },
    data: { chatArchivedAt: null }
  });
  return { deletedFiles };
}

/**
 * Политика хранения: помечаем сообщения isArchived, бронь chatArchivedAt (без физического удаления строк).
 */
export async function archiveBookingChatToColdStorage(bookingId: number): Promise<{ archivedRows: number }> {
  await migrateLegacyBookingChatLogs(bookingId);
  const result = await prisma.chatMessage.updateMany({
    where: { bookingId, deletedAt: null, isArchived: false },
    data: { isArchived: true }
  });
  await prisma.booking.update({
    where: { id: bookingId },
    data: { chatArchivedAt: new Date() }
  });
  return { archivedRows: result.count };
}

const TERMINAL_ARCHIVE_STATUSES = new Set([
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "CANCELLED_BY_GUEST"
]);

/** Брони: терминальный статус, выезд > N дней назад, ещё не chatArchivedAt, есть что архивировать. */
export async function findBookingsEligibleForChatArchive(daysAfterCheckout = 15): Promise<number[]> {
  const cutoff = new Date(Date.now() - daysAfterCheckout * 24 * 60 * 60 * 1000);
  const rows = await prisma.booking.findMany({
    where: {
      checkOut: { lt: cutoff },
      status: { in: [...TERMINAL_ARCHIVE_STATUSES] },
      chatArchivedAt: null,
      OR: [
        { chatMessages: { some: { isArchived: false, deletedAt: null } } },
        { logs: { some: { type: BOOKING_CHAT_LOG_TYPE } } }
      ]
    },
    select: { id: true }
  });
  return rows.map((r) => r.id);
}

export async function runChatArchiveJob(): Promise<{ processed: number; errors: string[] }> {
  const ids = await findBookingsEligibleForChatArchive(15);
  const errors: string[] = [];
  let processed = 0;
  for (const id of ids) {
    try {
      await archiveBookingChatToColdStorage(id);
      processed += 1;
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { processed, errors };
}

export async function getArchivedChatExport(bookingId: number): Promise<ArchivedExportRow[]> {
  const flagged = await prisma.chatMessage.findMany({
    where: {
      bookingId,
      OR: [{ isArchived: true }, { deletedAt: { not: null } }]
    },
    orderBy: { createdAt: "asc" }
  });
  const legacy = await prisma.chatArchive.findMany({
    where: { bookingId },
    orderBy: { originalCreatedAt: "asc" }
  });

  const fromFlagged: ArchivedExportRow[] = flagged.map((m) => ({
    id: m.id,
    source: "chat_message",
    senderId: m.senderId,
    senderRole: m.senderRole,
    senderName: m.senderName,
    body: m.body,
    imageUrl: m.imageUrl,
    originalCreatedAt: m.createdAt,
    archivedAt: m.isArchived ? m.createdAt : null,
    deletedAt: m.deletedAt
  }));

  const fromLegacy: ArchivedExportRow[] = legacy.map((m) => ({
    id: m.id,
    source: "legacy_archive",
    senderId: m.senderId,
    senderRole: m.senderRole,
    senderName: m.senderName,
    body: m.body,
    imageUrl: m.imageUrl,
    originalCreatedAt: m.originalCreatedAt,
    archivedAt: m.archivedAt,
    deletedAt: null
  }));

  return [...fromLegacy, ...fromFlagged].sort(
    (a, b) => a.originalCreatedAt.getTime() - b.originalCreatedAt.getTime()
  );
}
