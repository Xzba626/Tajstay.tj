import { prisma } from "@/lib/prisma";

/** New Hotel awaiting review (first submission or a resubmit after rejection). */
export async function notifyAdminsHotelPending(hotelId: number, hotelName: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      bookingId: null,
      type: "HOTEL_PENDING_REVIEW",
      title: `Новый объект на проверку: ${hotelName}`,
      link: "/dashboard/admin?section=hotels",
      isRead: false
    }))
  });
}
