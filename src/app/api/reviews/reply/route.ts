import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";

const schema = z.object({
  reviewId: z.number().int(),
  reply: z.string().min(2).max(2000)
});

export async function POST(req: Request) {
  const user = await requireUser(["OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { reviewId, reply } = parsed.data;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      booking: {
        include: {
          room: {
            include: { hotel: true }
          }
        }
      }
    }
  });

  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const hotelOwnerId = review.booking.room.hotel.ownerId;
  const canReply = user.role === "ADMIN" || user.id === hotelOwnerId;
  if (!canReply) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.review.update({
    where: { id: reviewId },
    data: { reply }
  });

  return NextResponse.json({ ok: true });
}

