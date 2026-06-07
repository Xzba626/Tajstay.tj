import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/create";
import {
  sendHotelApprovedOwnerEmail,
  sendHotelRejectedOwnerEmail
} from "@/lib/email/hotelModerationEmails";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export async function approveHotel(hotelId: number, adminId: number) {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: { owner: true }
  });
  if (!hotel) return { ok: false as const, error: "not_found" };

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      status: "APPROVED",
      rejectionReason: null
    }
  });

  const locale = getLocale();
  await createNotification({
    userId: hotel.ownerId,
    type: "HOTEL_APPROVED",
    title: m(locale, "notifications.HOTEL_APPROVED"),
    message: `«${hotel.name}» теперь виден гостям.`,
    link: "/dashboard/owner?section=properties"
  });

  if (hotel.owner.email) {
    await sendHotelApprovedOwnerEmail({ to: hotel.owner.email, hotelName: hotel.name });
  }

  return { ok: true as const, hotel, adminId };
}

export async function rejectHotel(hotelId: number, adminId: number, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false as const, error: "reason_required" };

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: { owner: true }
  });
  if (!hotel) return { ok: false as const, error: "not_found" };

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      status: "REJECTED",
      rejectionReason: trimmed
    }
  });

  const locale = getLocale();
  await createNotification({
    userId: hotel.ownerId,
    type: "HOTEL_REJECTED",
    title: m(locale, "notifications.HOTEL_REJECTED"),
    message: `${m(locale, "notifications.ownerRejectedBody")}: ${trimmed}`,
    link: "/dashboard/owner?section=properties"
  });

  if (hotel.owner.email) {
    await sendHotelRejectedOwnerEmail({
      to: hotel.owner.email,
      hotelName: hotel.name,
      reason: trimmed
    });
  }

  return { ok: true as const, hotel, adminId };
}
