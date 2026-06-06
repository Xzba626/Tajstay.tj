import { safeSend } from "@/lib/email/safeSend";

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
    subject: "TajStay: Новый объект требует проверки",
    html: `
      <h2>Новый объект на модерацию</h2>
      <p>Хост: ${input.ownerName} (${input.ownerEmail ?? "—"})</p>
      <p>Объект: ${input.hotelName}</p>
      <p>Адрес: ${input.hotelAddress}</p>
      <a href="${link}">Открыть на модерацию</a>
    `
  });
}

export async function sendHotelApprovedOwnerEmail(input: { to: string; hotelName: string }) {
  return safeSend({
    to: input.to,
    subject: "TajStay: Объект одобрен",
    html: `
      <h2>Объект одобрен</h2>
      <p>Ваш объект «${input.hotelName}» одобрен и теперь виден гостям на TajStay.</p>
    `
  });
}

export async function sendHotelRejectedOwnerEmail(input: {
  to: string;
  hotelName: string;
  reason: string;
}) {
  return safeSend({
    to: input.to,
    subject: "TajStay: Объект отклонён",
    html: `
      <h2>Объект отклонён</h2>
      <p>Объект «${input.hotelName}» не прошёл модерацию.</p>
      <p><strong>Причина:</strong> ${input.reason}</p>
      <p>Исправьте замечания и подайте объект на проверку снова в личном кабинете.</p>
    `
  });
}
