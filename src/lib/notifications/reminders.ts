import { addDays, endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/create";
import { bookingHotel } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

async function sentRecently(bookingId: number, type: string, since: Date): Promise<boolean> {
  const count = await prisma.notification.count({
    where: { bookingId, type, createdAt: { gte: since } }
  });
  return count > 0;
}

export async function runBookingReminderJob() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const dedupeSince = addDays(todayStart, -1);

  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const yesterdayStart = startOfDay(addDays(now, -1));
  const yesterdayEnd = endOfDay(addDays(now, -1));

  let created = 0;

  const checkIns = await prisma.booking.findMany({
    where: {
      checkIn: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING_OWNER"] }
    },
    include: { user: true, ...bookingWithHotelInclude }
  });

  for (const b of checkIns) {
    if (await sentRecently(b.id, "CHECK_IN_REMINDER", dedupeSince)) continue;
    const link = b.publicCode ? `/payment/${b.publicCode}` : `/dashboard/bookings`;
    if (b.userId) {
      await createNotification({
        userId: b.userId,
        type: "CHECK_IN_REMINDER",
        bookingId: b.id,
        link
      });
      created += 1;
    }
    const ownerId = bookingHotel(b).ownerId;
    await createNotification({
      userId: ownerId,
      type: "CHECK_IN_REMINDER",
      bookingId: b.id,
      link: `/dashboard/owner?section=bookings`
    });
    created += 1;
  }

  const checkOuts = await prisma.booking.findMany({
    where: {
      checkOut: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] }
    },
    include: { user: true, ...bookingWithHotelInclude }
  });

  for (const b of checkOuts) {
    if (await sentRecently(b.id, "CHECK_OUT_REMINDER", dedupeSince)) continue;
    if (b.userId) {
      await createNotification({
        userId: b.userId,
        type: "CHECK_OUT_REMINDER",
        bookingId: b.id,
        link: `/dashboard/bookings`
      });
      created += 1;
    }
    await createNotification({
      userId: bookingHotel(b).ownerId,
      type: "CHECK_OUT_REMINDER",
      bookingId: b.id,
      link: `/dashboard/owner?section=bookings`
    });
    created += 1;
  }

  const reviewEligible = await prisma.booking.findMany({
    where: {
      checkOut: { gte: yesterdayStart, lte: yesterdayEnd },
      status: "COMPLETED",
      review: null,
      userId: { not: null }
    },
    select: { id: true, userId: true, publicCode: true }
  });

  for (const b of reviewEligible) {
    if (!b.userId) continue;
    if (await sentRecently(b.id, "REVIEW_AVAILABLE", dedupeSince)) continue;
    await createNotification({
      userId: b.userId,
      type: "REVIEW_AVAILABLE",
      bookingId: b.id,
      link: `/dashboard/guest`
    });
    created += 1;
  }

  return { created, checkIns: checkIns.length, checkOuts: checkOuts.length, reviews: reviewEligible.length };
}
