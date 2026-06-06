import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { addBookingSystemMessage } from "@/lib/chat/bookingChat";
import { createNotification } from "@/lib/notifications/create";
import { m } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/get-locale";
import { dispatchReviewRequestEmail } from "@/lib/email/bookingEmailDispatch";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["GUEST"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id) || id < 1) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (booking.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Checkout only after payment" }, { status: 400 });
  }

  if (booking.status !== BOOKING_STATUS.CONFIRMED && booking.status !== BOOKING_STATUS.CHECKED_IN) {
    return NextResponse.json({ error: "Invalid booking status" }, { status: 400 });
  }

  const today = startOfLocalDay(new Date());
  const checkoutDay = startOfLocalDay(booking.checkOut);
  if (today.getTime() < checkoutDay.getTime()) {
    return NextResponse.json({ error: "Checkout available on or after check-out date" }, { status: 400 });
  }

  const locale = getLocale();
  await prisma.booking.update({
    where: { id },
    data: { status: BOOKING_STATUS.COMPLETED }
  });

  await addBookingSystemMessage({
    bookingId: id,
    message: `🛡️ ${m(locale, "chat.checkoutConfirmedSystem")}`
  });

  await createNotification({
    userId: user.id,
    type: "REVIEW_AVAILABLE",
    bookingId: id,
    link: `/dashboard/bookings`
  });

  void dispatchReviewRequestEmail(id).catch((e) => {
    console.error("[confirm-checkout] review email failed", id, e);
  });

  return NextResponse.json({ ok: true, status: BOOKING_STATUS.COMPLETED });
}
