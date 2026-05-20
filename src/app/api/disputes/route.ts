import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { createNotification } from "@/lib/notifications/create";

const schema = z.object({
  bookingId: z.number().int(),
  reason: z.string().min(10).max(2000)
});

export async function POST(req: Request) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { room: { include: { hotel: true } }, user: true }
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const ownerId = booking.room.hotel.ownerId;
  const guestId = booking.userId;
  const isGuest = guestId === user.id;
  const isOwner = ownerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isGuest && !isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const againstId = isGuest ? ownerId : isOwner && guestId ? guestId : ownerId;

  const existing = await prisma.dispute.findFirst({
    where: { bookingId: booking.id, status: "OPEN" }
  });
  if (existing) {
    return NextResponse.json({ error: "Dispute already open", disputeId: existing.id }, { status: 409 });
  }

  const dispute = await prisma.dispute.create({
    data: {
      bookingId: booking.id,
      openedById: user.id,
      againstId,
      reason: parsed.data.reason.trim()
    }
  });

  const notifyIds = new Set<number>([ownerId]);
  if (guestId) notifyIds.add(guestId);
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true }, take: 20 });
  for (const a of admins) notifyIds.add(a.id);

  await Promise.all(
    [...notifyIds].map((userId) =>
      createNotification({
        userId,
        type: "DISPUTE_OPENED",
        bookingId: booking.id,
        link: `/chat/booking/${booking.id}`
      })
    )
  );

  return NextResponse.json({ ok: true, disputeId: dispute.id });
}

export async function GET(req: Request) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number(new URL(req.url).searchParams.get("bookingId") || "") || 0;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { include: { hotel: true } } }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canView =
    user.role === "ADMIN" ||
    booking.userId === user.id ||
    booking.room.hotel.ownerId === user.id;
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const disputes = await prisma.dispute.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return NextResponse.json({ ok: true, items: disputes });
}
