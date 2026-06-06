import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://tajstay.site"
  ).replace(/\/$/, "");
}

async function safeSend(params: { to: string; subject: string; html: string }) {
  const resend = getResendClient();
  if (!resend) return;
  const to = params.to.trim();
  if (!to) return;
  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: params.subject,
      html: params.html
    });
    if (error) console.error("[email] send failed:", error);
  } catch (e) {
    console.error("[email] send failed:", e);
  }
}

export async function sendBookingCreatedEmail(params: {
  guestEmail: string;
  guestName: string;
  bookingCode: string;
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  currency: string;
  paymentUrl: string;
}) {
  await safeSend({
    to: params.guestEmail,
    subject: `TajStay: Бронь #${params.bookingCode} создана`,
    html: `
      <h2>Здравствуйте, ${params.guestName}!</h2>
      <p>Ваша бронь успешно создана и ожидает оплаты.</p>
      <table>
        <tr><td>Отель:</td><td>${params.hotelName}</td></tr>
        <tr><td>Заезд:</td><td>${params.checkIn.toLocaleDateString("ru")}</td></tr>
        <tr><td>Выезд:</td><td>${params.checkOut.toLocaleDateString("ru")}</td></tr>
        <tr><td>Сумма:</td><td>${params.totalPrice} ${params.currency}</td></tr>
        <tr><td>Номер брони:</td><td>${params.bookingCode}</td></tr>
      </table>
      <a href="${params.paymentUrl}" style="
        display:inline-block;
        background:#1a6b3c;
        color:white;
        padding:12px 24px;
        border-radius:8px;
        text-decoration:none;
        margin-top:16px;
      ">Перейти к оплате</a>
      <p style="color:#666;font-size:12px;">
        Бронь будет отменена автоматически если не оплатить вовремя.
      </p>
    `
  });
}

export async function sendNewBookingToHostEmail(params: {
  hostEmail: string;
  hostName: string;
  guestName: string;
  guestPhone?: string;
  bookingCode: string;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  dashboardUrl: string;
}) {
  await safeSend({
    to: params.hostEmail,
    subject: `TajStay: Новая бронь #${params.bookingCode}`,
    html: `
      <h2>Здравствуйте, ${params.hostName}!</h2>
      <p>Поступила новая бронь на ваш объект.</p>
      <table>
        <tr><td>Гость:</td><td>${params.guestName}</td></tr>
        ${params.guestPhone ? `<tr><td>Телефон:</td><td>${params.guestPhone}</td></tr>` : ""}
        <tr><td>Номер:</td><td>${params.roomName}</td></tr>
        <tr><td>Заезд:</td><td>${params.checkIn.toLocaleDateString("ru")}</td></tr>
        <tr><td>Выезд:</td><td>${params.checkOut.toLocaleDateString("ru")}</td></tr>
        <tr><td>Сумма:</td><td>${params.totalPrice}</td></tr>
      </table>
      <a href="${params.dashboardUrl}">Открыть панель управления</a>
    `
  });
}

export async function sendBookingConfirmedEmail(params: {
  guestEmail: string;
  guestName: string;
  hotelName: string;
  hotelAddress: string;
  checkIn: Date;
  checkOut: Date;
  hostPhone?: string;
  chatUrl: string;
}) {
  await safeSend({
    to: params.guestEmail,
    subject: "TajStay: Бронь подтверждена ✅",
    html: `
      <h2>Ваша бронь подтверждена!</h2>
      <p>Хозяин принял вашу бронь в <strong>${params.hotelName}</strong>.</p>
      <p>Адрес: ${params.hotelAddress}</p>
      <p>Заезд: ${params.checkIn.toLocaleDateString("ru")}</p>
      <p>Выезд: ${params.checkOut.toLocaleDateString("ru")}</p>
      ${params.hostPhone ? `<p>Телефон хозяина: ${params.hostPhone}</p>` : ""}
      <a href="${params.chatUrl}">Написать хозяину</a>
    `
  });
}

export async function sendBookingCancelledEmail(params: {
  email: string;
  name: string;
  bookingCode: string;
  cancelledBy: "guest" | "host" | "admin" | "system";
  reason?: string;
  hotelName: string;
}) {
  const cancellerText = {
    guest: "вами",
    host: "хозяином",
    admin: "администрацией TajStay",
    system: "системой автоматически"
  }[params.cancelledBy];

  await safeSend({
    to: params.email,
    subject: `TajStay: Бронь #${params.bookingCode} отменена`,
    html: `
      <h2>Бронь отменена</h2>
      <p>Бронь #${params.bookingCode} в ${params.hotelName} была отменена ${cancellerText}.</p>
      ${params.reason ? `<p>Причина: ${params.reason}</p>` : ""}
      <a href="${appBaseUrl()}">Найти другой вариант</a>
    `
  });
}

export async function sendCheckInReminderEmail(params: {
  guestEmail: string;
  guestName: string;
  hotelName: string;
  hotelAddress: string;
  checkIn: Date;
  hostPhone?: string;
  chatUrl: string;
}) {
  await safeSend({
    to: params.guestEmail,
    subject: `TajStay: Завтра заезд в ${params.hotelName}`,
    html: `
      <h2>Напоминание о заезде</h2>
      <p>Здравствуйте, ${params.guestName}!</p>
      <p>Завтра <strong>${params.checkIn.toLocaleDateString("ru")}</strong>
         ваш заезд в <strong>${params.hotelName}</strong>.</p>
      <p>Адрес: ${params.hotelAddress}</p>
      ${params.hostPhone ? `<p>Если нужно — позвоните хозяину: ${params.hostPhone}</p>` : ""}
      <a href="${params.chatUrl}">Написать хозяину</a>
    `
  });
}

export async function sendReviewRequestEmail(params: {
  guestEmail: string;
  guestName: string;
  hotelName: string;
  reviewUrl: string;
}) {
  await safeSend({
    to: params.guestEmail,
    subject: `Как прошло пребывание в ${params.hotelName}?`,
    html: `
      <h2>Оцените ваше пребывание</h2>
      <p>Здравствуйте, ${params.guestName}!</p>
      <p>Надеемся, вам понравилось в <strong>${params.hotelName}</strong>.</p>
      <p>Оставьте отзыв — это займёт 1 минуту и поможет другим гостям.</p>
      <a href="${params.reviewUrl}" style="
        display:inline-block;
        background:#1a6b3c;
        color:white;
        padding:12px 24px;
        border-radius:8px;
        text-decoration:none;
      ">Оставить отзыв ⭐</a>
    `
  });
}

export { appBaseUrl };
