import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const safeImageUrl = z
  .string()
  .max(2048)
  .optional()
  .nullable()
  .refine((u) => {
    if (u == null || u === "") return true;
    if (u.startsWith("/") && !u.startsWith("//")) return true;
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "imageUrl must be https or site-relative" });

const schema = z.object({
  bookingId: z.number().int(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(2000),
  imageUrl: safeImageUrl
});

export async function POST(req: Request) {
  const user = await requireUser(["GUEST", "OWNER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:review:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const userRl = rateLimit(`post:review:user:${user.id}`, 5, 24 * 60 * 60_000);
  if (!userRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (userRl.retryAfterSec) res.headers.set("Retry-After", String(userRl.retryAfterSec));
    return res;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { bookingId, rating, comment, imageUrl } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: { include: { hotel: true } }
    }
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Review rule: only after staying (check-out passed) + successful paid booking.
  if (booking.status !== "CONFIRMED") return NextResponse.json({ error: "Отзыв доступен только после подтверждения брони владельцем" }, { status: 400 });
  if (booking.paymentStatus !== "PAID") return NextResponse.json({ error: "Review allowed only for paid stays" }, { status: 400 });
  if (booking.checkOut.getTime() > Date.now()) return NextResponse.json({ error: "Review allowed only after check-out" }, { status: 400 });

  const existing = await prisma.review.findUnique({ where: { bookingId } });
  if (existing) return NextResponse.json({ error: "Review already exists" }, { status: 409 });

  const review = await prisma.review.create({
    data: {
      bookingId,
      rating,
      comment,
      imageUrl: imageUrl ?? null
    }
  });

  // Recompute rating for the hotel using all reviews.
  const hotelId = booking.room.hotel.id;
  const hotelReviews = await prisma.review.findMany({
    where: { booking: { room: { hotelId } } },
    select: { rating: true }
  });
  const avg = hotelReviews.length ? hotelReviews.reduce((s, r) => s + r.rating, 0) / hotelReviews.length : 0;

  await prisma.hotel.update({
    where: { id: hotelId },
    data: { rating: Number(avg.toFixed(2)) }
  });

  return NextResponse.json({ ok: true, reviewId: review.id });
}

