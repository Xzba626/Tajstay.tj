import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { bookingHotelOptional } from "@/lib/pms/bookingContext";
import { recalculateHotelRating } from "@/lib/reviews/recalculateHotelRating";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import {
  averageCriteriaRating,
  encodeCriteriaInComment,
  type ReviewCriteriaScores
} from "@/lib/reviews/criteria";

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

const criteriaSchema = z.object({
  cleanliness: z.number().int().min(1).max(5),
  staff: z.number().int().min(1).max(5),
  location: z.number().int().min(1).max(5),
  value: z.number().int().min(1).max(5),
  overall: z.number().int().min(1).max(5)
});

const schema = z
  .object({
    bookingId: z.number().int(),
    rating: z.number().int().min(1).max(5).optional(),
    criteria: criteriaSchema.optional(),
    comment: z.string().max(2000).optional(),
    imageUrl: safeImageUrl
  })
  .refine((d) => d.rating != null || d.criteria != null, {
    message: "rating or criteria required"
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

  const { bookingId, imageUrl } = parsed.data;
  const criteria = parsed.data.criteria as ReviewCriteriaScores | undefined;
  const rating = criteria ? averageCriteriaRating(criteria) : (parsed.data.rating ?? 5);
  const commentText = (parsed.data.comment ?? "").trim();
  const comment = criteria
    ? encodeCriteriaInComment(commentText || "—", criteria)
    : commentText.length >= 5
      ? commentText
      : null;

  if (!comment) {
    return NextResponse.json({ error: "Comment must be at least 5 characters when criteria omitted" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: { include: { hotel: true } }
    }
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowedStatus =
    booking.status === BOOKING_STATUS.CONFIRMED || booking.status === BOOKING_STATUS.COMPLETED;
  if (!allowedStatus) {
    return NextResponse.json({ error: "Отзыв доступен только после подтверждённого проживания" }, { status: 400 });
  }
  if (booking.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Review allowed only for paid stays" }, { status: 400 });
  }
  if (booking.checkOut.getTime() > Date.now()) {
    return NextResponse.json({ error: "Review allowed only after check-out" }, { status: 400 });
  }

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

  const hotel = bookingHotelOptional(booking);
  if (!hotel) {
    console.error("[review] Cannot find hotelId for booking", booking.id);
    return NextResponse.json({ error: "Невозможно определить отель для этой брони" }, { status: 400 });
  }

  await recalculateHotelRating(hotel.id);

  return NextResponse.json({ ok: true, reviewId: review.id });
}
