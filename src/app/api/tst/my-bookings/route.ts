import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { classifyTripsTab, normalizePaymentBadge, isStayPast } from "@/lib/trips/classify";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { canContinuePayment } from "@/lib/trips/historyRecord";

export const dynamic = "force-dynamic";

/**
 * Session-scoped booking summary for TST Assistant.
 * Never accepts userId from the client — only authenticated session.
 */
export async function GET() {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  // Guests (and admins inspecting their own guest bookings): only this userId.
  // Owners still only see bookings they made as guests (userId), not hotel guests.
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: {
      ...bookingWithHotelInclude,
      review: { select: { id: true } }
    },
    orderBy: { checkIn: "asc" },
    take: 100
  });

  const now = new Date();
  const mapped = bookings.map((b) => {
    const hotel = bookingHotel(b);
    const tab = classifyTripsTab(b, now);
    const pay = normalizePaymentBadge(b.paymentStatus);
    return {
      id: b.id,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomTitle: bookingRoomTitle(b),
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString(),
      status: b.status,
      paymentStatus: b.paymentStatus,
      paymentBadge: pay,
      publicCode: b.publicCode,
      tab,
      detailPath: `/chat/booking/${b.id}`,
      paymentPath:
        canContinuePayment({
          status: b.status,
          paymentStatus: b.paymentStatus,
          publicCode: b.publicCode,
          expiresAt: b.expiresAt,
          paymentTimerPaused: b.paymentTimerPaused
        }) && b.publicCode
          ? `/payment/${b.publicCode}`
          : null
    };
  });

  const unpaid = mapped.filter((b) => b.paymentPath != null);
  const upcoming = mapped.filter((b) => b.tab === "confirmed" || (b.tab === "unconfirmed" && !isStayPast(new Date(b.checkOut), now)));
  const next = upcoming[0] ?? null;
  const last = [...mapped].sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())[0] ?? null;

  return NextResponse.json(
    {
      userId: user.id,
      counts: {
        all: mapped.length,
        confirmed: mapped.filter((b) => b.tab === "confirmed").length,
        unconfirmed: mapped.filter((b) => b.tab === "unconfirmed").length,
        past: mapped.filter((b) => b.tab === "past").length,
        cancelled: mapped.filter((b) => b.tab === "cancelled").length,
        unpaid: unpaid.length
      },
      next,
      last,
      unpaid: unpaid.slice(0, 5),
      bookings: mapped.slice(0, 20)
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
