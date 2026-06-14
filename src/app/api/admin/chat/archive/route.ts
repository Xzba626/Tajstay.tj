import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getArchivedChatExport } from "@/lib/chat/bookingChat";
import { searchArchivedChatBookings } from "@/lib/chat/archiveSearch";
import { bookingHotel, bookingRoomTitle, bookingPhysicalRoomId } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

/** Список архивных чатов или выгрузка одной брони. */
export async function GET(req: NextRequest) {
  const user = await requireUser(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingIdRaw = String(req.nextUrl.searchParams.get("bookingId") ?? "").trim();
  const bookingId = Number.parseInt(bookingIdRaw, 10);

  if (!bookingIdRaw) {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    const page = Number.parseInt(String(req.nextUrl.searchParams.get("page") ?? "1"), 10);
    const pageSize = Number.parseInt(String(req.nextUrl.searchParams.get("pageSize") ?? "20"), 10);
    const result = await searchArchivedChatBookings({ q, from, to, page, pageSize });
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  }

  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      ...bookingWithHotelInclude,
      user: { select: { id: true, name: true, phone: true } },
      payment: true
    }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hotel = bookingHotel(booking);
  const archivedMessages = await getArchivedChatExport(bookingId);

  return NextResponse.json(
    {
      ok: true,
      exportedAt: new Date().toISOString(),
      booking: {
        id: booking.id,
        publicCode: booking.publicCode,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        paymentProofUrl: booking.paymentProofUrl,
        guestDocumentUrl: booking.guestDocumentUrl,
        totalPrice: Number(booking.totalPrice),
        guest: booking.user,
        hotel: { id: hotel.id, name: hotel.name },
        room: { id: bookingPhysicalRoomId(booking), title: bookingRoomTitle(booking) }
      },
      payment: booking.payment
        ? {
            id: booking.payment.id,
            status: booking.payment.status,
            amount: Number(booking.payment.amount)
          }
        : null,
      chatArchivedAt: booking.chatArchivedAt?.toISOString() ?? null,
      archivedMessages: archivedMessages.map((m) => ({
        id: m.id,
        source: m.source,
        senderId: m.senderId,
        senderRole: m.senderRole,
        senderName: m.senderName,
        message: m.body,
        imageUrl: m.imageUrl,
        originalCreatedAt: m.originalCreatedAt.toISOString(),
        archivedAt: m.archivedAt?.toISOString() ?? null,
        deletedAt: m.deletedAt?.toISOString() ?? null
      }))
    },
    { status: 200 }
  );
}
