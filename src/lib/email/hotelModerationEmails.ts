import { safeSend } from "@/lib/email/safeSend";
import {
  emailButton,
  emailDetailCard,
  emailParagraph,
  emailStatusBlock,
  emailTitle
} from "@/lib/email/templates/components";
import { escapeHtml } from "@/lib/email/templates/escape";
import { renderEmailLayout } from "@/lib/email/templates/layout";

function adminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || "admin@tajstay.site";
}

function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendHotelPendingAdminEmail(input: {
  ownerName: string;
  ownerEmail: string | null;
  hotelName: string;
  hotelAddress: string;
  hotelId: number;
}) {
  const link = `${siteUrl()}/dashboard/admin?section=moderation&id=${input.hotelId}`;
  return safeSend({
    to: adminEmail(),
    subject: "TajStay: новый объект требует проверки",
    html: renderEmailLayout({
      title: "Новый объект на модерацию",
      preheader: `${input.hotelName} ожидает проверки`,
      body: `
        ${emailTitle("Новый объект на модерацию")}
        ${emailStatusBlock("warning", "Требуется проверка администратора")}
        ${emailDetailCard([
          { label: "Владелец", value: escapeHtml(input.ownerName) },
          { label: "Email", value: escapeHtml(input.ownerEmail ?? "—") },
          { label: "Объект", value: escapeHtml(input.hotelName) },
          { label: "Адрес", value: escapeHtml(input.hotelAddress) }
        ])}
        ${emailButton("Открыть модерацию", link)}
      `
    })
  });
}

export async function sendHotelApprovedOwnerEmail(input: { to: string; hotelName: string }) {
  return safeSend({
    to: input.to,
    subject: "TajStay: объект одобрен",
    html: renderEmailLayout({
      title: "Объект одобрен",
      preheader: `${input.hotelName} опубликован на TajStay`,
      body: `
        ${emailTitle("Объект одобрен")}
        ${emailStatusBlock("success", "Опубликован", "Ваш объект теперь виден гостям на TajStay.")}
        ${emailParagraph(`Объект <strong>${escapeHtml(input.hotelName)}</strong> успешно прошёл модерацию.`)}
      `
    })
  });
}

export async function sendHotelRejectedOwnerEmail(input: {
  to: string;
  hotelName: string;
  reason: string;
}) {
  return safeSend({
    to: input.to,
    subject: "TajStay: объект отклонён",
    html: renderEmailLayout({
      title: "Объект отклонён",
      preheader: `${input.hotelName} не прошёл модерацию`,
      body: `
        ${emailTitle("Объект отклонён")}
        ${emailStatusBlock("danger", "Не прошёл модерацию", escapeHtml(input.reason))}
        ${emailParagraph(`Объект <strong>${escapeHtml(input.hotelName)}</strong> пока не опубликован.`)}
        ${emailParagraph("Исправьте замечания и отправьте объект на повторную проверку в личном кабинете.")}
      `
    })
  });
}
