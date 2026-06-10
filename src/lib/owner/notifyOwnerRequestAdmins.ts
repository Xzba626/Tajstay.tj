import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

function getAdminTelegramChatId(): string | null {
  const id = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  return id || null;
}

export async function notifyOwnerRequestAdmins(params: { applicationId: number; fullName: string }) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        bookingId: null,
        type: "OWNER_APPLICATION_NEW",
        isRead: false
      }))
    });
  }

  const chatId = getAdminTelegramChatId();
  if (!chatId) return;

  const locale = getLocale();
  const title = m(locale, "notifications.OWNER_APPLICATION_NEW");
  const text = `📋 <b>${title}</b>\n\n${params.fullName}\nID: ${params.applicationId}\n\n/dashboard/owner-requests/${params.applicationId}`;
  await sendTelegramMessage({ chatId, text }).catch(() => undefined);
}
