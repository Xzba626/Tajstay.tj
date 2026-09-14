import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { authorizeBookingAccess } from "@/lib/pms/bookingAuthorization";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

const NOT_FOUND = () => new NextResponse("Not found", { status: 404 });

/**
 * Shared entry check for every `/api/files/booking/[bookingId]/*` route: session required,
 * per-IP rate limit (defense-in-depth against booking-ID enumeration, same utility already used
 * by payments/proof), booking loaded, and the same three-way guest/owner/admin rule used by the
 * chat page itself. Always returns a plain 404 on any failure - never distinguishes
 * "not authenticated" from "wrong user" from "booking doesn't exist" to a caller who isn't
 * authorized to know which.
 */
export async function authorizeBookingFileRequest(
  req: NextRequest,
  bookingIdRaw: string,
  rateLimitKey: string
): Promise<{ booking: NonNullable<Awaited<ReturnType<typeof loadBooking>>> } | { response: NextResponse }> {
  const ip = clientIp(req);
  const rl = rateLimit(`get:files:${rateLimitKey}:${ip}`, 60, 60_000);
  if (!rl.ok) return { response: new NextResponse("Too many requests", { status: 429 }) };

  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return { response: NOT_FOUND() };

  const bookingId = Number.parseInt(bookingIdRaw, 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) return { response: NOT_FOUND() };

  const booking = await loadBooking(bookingId);
  if (!booking) return { response: NOT_FOUND() };

  const { allowed } = authorizeBookingAccess(booking, user);
  if (!allowed) return { response: NOT_FOUND() };

  return { booking };
}

async function loadBooking(bookingId: number) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotelInclude
  });
}
