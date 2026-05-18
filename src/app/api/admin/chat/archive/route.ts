import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getArchivedChatExport } from "@/lib/chat/bookingChat";

/** Выгрузка архива переписки и метаданных брони (налоги / споры). */
export async function GET(req: NextRequest) {
  const user = await requireUser(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(req.nextUrl.searchParams.get("bookingId") ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: { include: { hotel: true } },
      user: { select: { id: true, name: true, phone: true } },
      payment: true
    }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
        hotel: { id: booking.room.hotel.id, name: booking.room.hotel.name },
        room: { id: booking.room.id, title: booking.room.title }
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
