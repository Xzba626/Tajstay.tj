import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { createNotification } from "@/lib/notifications/create";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { decryptOwnerApplicationRow } from "@/lib/owner/ownerApplicationPii";
import { resolvePropertyTypeId } from "@/lib/propertyTypes/seed";

export async function approveOwnerRequest(applicationId: number, admin: User) {
  const application = await prisma.ownerApplication.findUnique({
    where: { id: applicationId },
    include: { user: true }
  });
  if (!application) return { error: "Not found", status: 404 as const };
  if (application.status !== OWNER_APPLICATION_STATUS.PENDING) {
    return { error: "Заявка уже обработана", status: 400 as const };
  }

  const decrypted = decryptOwnerApplicationRow(application);
  const meta = decrypted.applicationMeta;

  await prisma.$transaction(async (tx) => {
    await tx.ownerApplication.update({
      where: { id: applicationId },
      data: {
        status: OWNER_APPLICATION_STATUS.APPROVED,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        comment: null,
        rejectionReason: null
      }
    });
    await tx.user.update({
      where: { id: application.userId },
      data: { role: "OWNER" }
    });

    const existingHotel = await tx.hotel.findFirst({
      where: { ownerId: application.userId, deletedAt: null }
    });
    if (!existingHotel) {
      const typeRow = await resolvePropertyTypeId({
        propertyTypeId: null,
        propertyTypeCode: meta?.propertyType || "HOTEL"
      });
      await tx.hotel.create({
        data: {
          ownerId: application.userId,
          name: decrypted.businessName || decrypted.fullName,
          city: meta?.city || "Душанбе",
          address: decrypted.address || meta?.address || "—",
          description: meta?.propertyDescription || "Объект создан из заявки владельца",
          latitude: 38.5598,
          longitude: 68.787,
          propertyTypeId: typeRow?.id,
          propertyType: typeRow?.code ?? "HOTEL",
          status: "PENDING"
        }
      });
    }
  });

  const locale = getLocale();
  await createNotification({
    userId: application.userId,
    type: "OWNER_APPLICATION_APPROVED",
    title: m(locale, "notifications.OWNER_APPLICATION_APPROVED"),
    message: m(locale, "notifications.ownerApprovedBody"),
    link: "/dashboard/owner?onboarding=1"
  });

  return { ok: true as const };
}

export async function rejectOwnerRequest(applicationId: number, admin: User, adminComment: string) {
  const application = await prisma.ownerApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { error: "Not found", status: 404 as const };
  if (application.status !== OWNER_APPLICATION_STATUS.PENDING) {
    return { error: "Заявка уже обработана", status: 400 as const };
  }

  const trimmed = adminComment.trim();
  if (!trimmed) return { error: "Нужен комментарий", status: 400 as const };

  await prisma.ownerApplication.update({
    where: { id: applicationId },
    data: {
      status: OWNER_APPLICATION_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      rejectionReason: trimmed,
      comment: null
    }
  });

  const locale = getLocale();
  await createNotification({
    userId: application.userId,
    type: "OWNER_APPLICATION_REJECTED",
    title: m(locale, "notifications.OWNER_APPLICATION_REJECTED"),
    message: `${m(locale, "notifications.ownerRejectedBody")}: ${trimmed}`,
    link: "/profile/become-owner"
  });

  return { ok: true as const };
}
