import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Transaction-capable client: either the root client or a `$transaction` handle. */
export type DeliveryDb = PrismaClient | Prisma.TransactionClient;

export const DELIVERY_CHANGE = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  CANCELLED: "CANCELLED"
} as const;
export type DeliveryChangeType = (typeof DELIVERY_CHANGE)[keyof typeof DELIVERY_CHANGE];

/** Protocol version carried in every sync response so the desktop can gate on it. */
export const DELIVERY_PROTOCOL_VERSION = 1;

/**
 * Snapshot policy (§29): a new device does NOT receive the hotel's entire history. It receives the
 * operational window reception actually works from — anything not yet checked out, plus a short
 * look-back so a guest who checked out yesterday is still resolvable at the desk.
 */
export const SNAPSHOT_PAST_DAYS = 7;
export const DELIVERY_PAGE_LIMIT_DEFAULT = 100;
export const DELIVERY_PAGE_LIMIT_MAX = 500;

/**
 * Allocate the next per-hotel revision and append a delivery change — the ONE primitive every
 * booking mutation goes through (§5).
 *
 * Correctness (§3): the revision is allocated with an INSERT ... ON CONFLICT DO UPDATE ...
 * RETURNING against the hotel's HotelDeliveryCursor row. That statement takes a row lock held
 * until the surrounding transaction commits, so a concurrent mutation for the same hotel BLOCKS
 * before it can allocate. Commit order therefore equals revision order, and an incremental reader
 * ordering by `revision` can never step past a revision that is still in flight. This is why the
 * cursor is `revision`, not `id` (ids are assigned at INSERT and can commit out of order).
 *
 * MUST be called with the same `db` (transaction client) as the Booking mutation (§7), otherwise a
 * crash between the two would leave a Booking with no delivery event.
 */
export async function recordBookingDeliveryChange(
  db: DeliveryDb,
  input: { bookingId: number; hotelId: number; changeType: DeliveryChangeType }
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ lastRevision: number }>>`
    INSERT INTO "HotelDeliveryCursor" ("hotelId", "lastRevision", "updatedAt")
    VALUES (${input.hotelId}, 1, NOW())
    ON CONFLICT ("hotelId")
    DO UPDATE SET "lastRevision" = "HotelDeliveryCursor"."lastRevision" + 1, "updatedAt" = NOW()
    RETURNING "lastRevision"
  `;
  const revision = Number(rows[0]?.lastRevision);
  if (!Number.isFinite(revision)) throw new Error("delivery_revision_allocation_failed");

  await db.bookingDeliveryChange.create({
    data: {
      bookingId: input.bookingId,
      hotelId: input.hotelId,
      changeType: input.changeType,
      revision
    }
  });
  return revision;
}

/**
 * Resolve a booking's hotel. Booking has no direct hotelId — scope comes through roomType/room,
 * so delivery uses the same relation the rest of the domain does rather than inventing a column.
 */
export async function resolveBookingHotelId(db: DeliveryDb, bookingId: number): Promise<number | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { roomType: { select: { hotelId: true } }, room: { select: { hotelId: true } } }
  });
  return booking?.roomType?.hotelId ?? booking?.room?.hotelId ?? null;
}

/** Convenience wrapper for call sites that do not already know the hotel. */
export async function recordBookingDeliveryChangeById(
  db: DeliveryDb,
  bookingId: number,
  changeType: DeliveryChangeType
): Promise<number | null> {
  const hotelId = await resolveBookingHotelId(db, bookingId);
  if (!hotelId) return null;
  return recordBookingDeliveryChange(db, { bookingId, hotelId, changeType });
}

/** Fields the reception desk needs — deliberately excludes credentials, payment secrets, passport. */
export const deliveryBookingSelect = {
  id: true,
  publicCode: true,
  source: true,
  status: true,
  paymentStatus: true,
  checkIn: true,
  checkOut: true,
  guestCount: true,
  guestName: true,
  guestPhone: true,
  phone: true,
  totalPrice: true,
  createdAt: true,
  room: { select: { id: true, title: true, roomNumber: true, hotelId: true } },
  assignedRoom: { select: { id: true, title: true, roomNumber: true, hotelId: true } },
  roomType: { select: { id: true, name: true, hotelId: true } },
  user: { select: { name: true } }
} satisfies Prisma.BookingSelect;

type DeliveryBookingRow = Prisma.BookingGetPayload<{ select: typeof deliveryBookingSelect }>;

/** Stable DTO the desktop upserts by `bookingId` (§12/§13). */
export function toDeliveryDto(b: DeliveryBookingRow, revision: number | null) {
  const physical = b.assignedRoom ?? b.room;
  return {
    bookingId: b.id,
    reference: b.publicCode ?? null,
    source: b.source,
    status: b.status,
    paymentStatus: b.paymentStatus,
    checkIn: b.checkIn.toISOString(),
    checkOut: b.checkOut.toISOString(),
    guestCount: b.guestCount,
    guestName: b.guestName?.trim() || b.user?.name?.trim() || null,
    guestPhone: b.guestPhone?.trim() || b.phone?.trim() || null,
    room: physical ? { id: physical.id, number: physical.roomNumber ?? null, title: physical.title } : null,
    roomType: b.roomType ? { id: b.roomType.id, name: b.roomType.name } : null,
    totalPrice: b.totalPrice != null ? Number(b.totalPrice) : null,
    createdAt: b.createdAt.toISOString(),
    revision
  };
}

/**
 * Snapshot — the bootstrap AND reconciliation path. Reads Bookings directly, so bookings created
 * before the change-log existed are still delivered (§20/§32); it does not depend on change rows.
 */
export async function buildSnapshot(hotelId: number, limit: number, afterBookingId: number) {
  const since = new Date(Date.now() - SNAPSHOT_PAST_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.booking.findMany({
    where: {
      id: { gt: afterBookingId },
      checkOut: { gte: since },
      OR: [{ roomType: { hotelId } }, { room: { hotelId } }]
    },
    select: deliveryBookingSelect,
    orderBy: { id: "asc" },
    take: limit + 1
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // Current head revision: the cursor the device switches to for incremental sync after bootstrap.
  const cursorRow = await prisma.hotelDeliveryCursor.findUnique({ where: { hotelId } });
  return {
    items: page.map((b) => toDeliveryDto(b, null)),
    nextBookingId: page.length ? page[page.length - 1].id : afterBookingId,
    hasMore,
    headRevision: cursorRow?.lastRevision ?? 0
  };
}

/**
 * Incremental — changes strictly after `cursor`, ordered by the serialized revision.
 * Replay-safe: re-requesting the same cursor returns the same rows (§25/§26).
 */
export async function buildIncremental(hotelId: number, cursor: number, limit: number) {
  const changes = await prisma.bookingDeliveryChange.findMany({
    where: { hotelId, revision: { gt: cursor } },
    orderBy: { revision: "asc" },
    take: limit + 1,
    select: { revision: true, changeType: true, bookingId: true }
  });
  const hasMore = changes.length > limit;
  const page = hasMore ? changes.slice(0, limit) : changes;
  if (!page.length) {
    return { items: [], nextCursor: cursor, hasMore: false };
  }

  const bookings = await prisma.booking.findMany({
    where: { id: { in: [...new Set(page.map((c) => c.bookingId))] } },
    select: deliveryBookingSelect
  });
  const byId = new Map(bookings.map((b) => [b.id, b]));

  const items = page.map((c) => {
    const b = byId.get(c.bookingId);
    return {
      changeType: c.changeType,
      revision: c.revision,
      bookingId: c.bookingId,
      // A booking row can be absent only if it was hard-deleted; the change itself still tells the
      // desktop to drop it, so absence is never silently ignored (§8).
      booking: b ? toDeliveryDto(b, c.revision) : null
    };
  });

  return { items, nextCursor: page[page.length - 1].revision, hasMore };
}

export function clampLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DELIVERY_PAGE_LIMIT_DEFAULT;
  return Math.min(Math.floor(n), DELIVERY_PAGE_LIMIT_MAX);
}
