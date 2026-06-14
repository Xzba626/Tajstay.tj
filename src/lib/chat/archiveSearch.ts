import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export type ArchivedChatListItem = {
  bookingId: number;
  publicCode: string | null;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  chatArchivedAt: string;
  guestLabel: string;
  hotelName: string;
  roomTitle: string;
  messageCount: number;
};

function parseOptionalDate(raw: string | null | undefined): Date | undefined {
  const s = (raw ?? "").trim();
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

function buildSearchWhere(q: string): Prisma.BookingWhereInput["OR"] | undefined {
  const trimmed = q.trim();
  if (!trimmed) return undefined;

  const clauses: Prisma.BookingWhereInput[] = [];
  const code = trimmed.replace(/^#/, "");
  const idNum = Number.parseInt(code, 10);
  if (Number.isFinite(idNum) && idNum > 0) {
    clauses.push({ id: idNum });
  }

  clauses.push(
    { publicCode: { contains: code, mode: "insensitive" } },
    { guestName: { contains: trimmed, mode: "insensitive" } },
    { guestPhone: { contains: trimmed, mode: "insensitive" } },
    { phone: { contains: trimmed, mode: "insensitive" } },
    { user: { name: { contains: trimmed, mode: "insensitive" } } },
    { user: { phone: { contains: trimmed, mode: "insensitive" } } },
    { room: { hotel: { name: { contains: trimmed, mode: "insensitive" } } } },
    { roomType: { hotel: { name: { contains: trimmed, mode: "insensitive" } } } }
  );

  return clauses;
}

export async function searchArchivedChatBookings(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ArchivedChatListItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const from = parseOptionalDate(params.from);
  const to = parseOptionalDate(params.to);
  const searchOr = buildSearchWhere(params.q ?? "");

  const archivedAtFilter: Prisma.DateTimeNullableFilter = { not: null };
  if (from) archivedAtFilter.gte = from;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    archivedAtFilter.lte = end;
  }

  const where: Prisma.BookingWhereInput = {
    chatArchivedAt: archivedAtFilter,
    ...(searchOr?.length ? { OR: searchOr } : {})
  };

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        ...bookingWithHotelInclude,
        user: { select: { name: true, phone: true } },
        _count: { select: { chatMessages: true } }
      },
      orderBy: { chatArchivedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  const items: ArchivedChatListItem[] = rows.map((b) => {
    const hotel = bookingHotel(b);
    return {
      bookingId: b.id,
      publicCode: b.publicCode,
      status: b.status,
      paymentStatus: b.paymentStatus,
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString(),
      chatArchivedAt: b.chatArchivedAt!.toISOString(),
      guestLabel: b.guestName?.trim() || b.user?.name?.trim() || b.guestPhone?.trim() || b.phone || "—",
      hotelName: hotel.name,
      roomTitle: bookingRoomTitle(b),
      messageCount: b._count.chatMessages
    };
  });

  return { items, total, page, pageSize };
}
