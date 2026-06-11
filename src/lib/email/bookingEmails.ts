import { safeSend } from "@/lib/email/safeSend";
import {
  bookingCancelledEmailSubject,
  bookingConfirmedEmailSubject,
  renderBookingCancelledEmail,
  renderBookingConfirmedEmail,
  type BookingCancelledBy
} from "@/lib/email/templates";
import { escapeHtml } from "@/lib/email/templates/escape";
import {
  emailButton,
  emailDetailCard,
  emailMuted,
  emailParagraph,
  emailStatusBlock,
  emailTitle
} from "@/lib/email/templates/components";
import { renderEmailLayout } from "@/lib/email/templates/layout";

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://tajstay.site"
  ).replace(/\/$/, "");
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
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
  const html = renderEmailLayout({
    title: `Бронь ${params.bookingCode} создана`,
    preheader: `Оплатите бронь в ${params.hotelName}`,
    body: `
      ${emailTitle("Бронь создана")}
      ${emailStatusBlock("warning", "Ожидает оплаты", "Завершите оплату, чтобы закрепить бронирование за собой.")}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(params.guestName)}</strong>!`)}
      ${emailDetailCard([
        { label: "Номер брони", value: escapeHtml(params.bookingCode) },
        { label: "Объект", value: escapeHtml(params.hotelName) },
        { label: "Заезд", value: escapeHtml(formatDate(params.checkIn)) },
        { label: "Выезд", value: escapeHtml(formatDate(params.checkOut)) },
        { label: "Сумма", value: escapeHtml(`${params.totalPrice} ${params.currency}`) }
      ])}
      ${emailButton("Перейти к оплате", params.paymentUrl)}
      ${emailMuted("Бронь будет отменена автоматически, если оплата не поступит вовремя.")}
    `
  });

  await safeSend({
    to: params.guestEmail,
    subject: `TajStay: бронь ${params.bookingCode} создана`,
    html
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
  const rows = [
    { label: "Гость", value: escapeHtml(params.guestName) },
    { label: "Номер", value: escapeHtml(params.roomName) },
    { label: "Заезд", value: escapeHtml(formatDate(params.checkIn)) },
    { label: "Выезд", value: escapeHtml(formatDate(params.checkOut)) },
    { label: "Сумма", value: escapeHtml(String(params.totalPrice)) }
  ];
  if (params.guestPhone) rows.splice(1, 0, { label: "Телефон", value: escapeHtml(params.guestPhone) });

  const html = renderEmailLayout({
    title: `Новая бронь ${params.bookingCode}`,
    preheader: `Новая бронь от ${params.guestName}`,
    body: `
      ${emailTitle("Новая бронь")}
      ${emailStatusBlock("info", "Требуется внимание", "Поступила новая бронь на ваш объект.")}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(params.hostName)}</strong>!`)}
      ${emailDetailCard(rows)}
      ${emailButton("Открыть панель управления", params.dashboardUrl)}
    `
  });

  await safeSend({
    to: params.hostEmail,
    subject: `TajStay: новая бронь ${params.bookingCode}`,
    html
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
  bookingCode?: string | null;
}) {
  await safeSend({
    to: params.guestEmail,
    subject: bookingConfirmedEmailSubject(params.bookingCode),
    html: renderBookingConfirmedEmail({
      guestName: params.guestName,
      hotelName: params.hotelName,
      hotelAddress: params.hotelAddress,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      bookingCode: params.bookingCode,
      hostPhone: params.hostPhone,
      chatUrl: params.chatUrl
    })
  });
}

export async function sendBookingCancelledEmail(params: {
  email: string;
  name: string;
  bookingCode: string;
  cancelledBy: BookingCancelledBy;
  reason?: string;
  hotelName: string;
}) {
  await safeSend({
    to: params.email,
    subject: bookingCancelledEmailSubject(params.bookingCode),
    html: renderBookingCancelledEmail({
      name: params.name,
      bookingCode: params.bookingCode,
      hotelName: params.hotelName,
      cancelledBy: params.cancelledBy,
      reason: params.reason,
      searchUrl: appBaseUrl()
    })
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
  const rows = [
    { label: "Объект", value: escapeHtml(params.hotelName) },
    { label: "Адрес", value: escapeHtml(params.hotelAddress) },
    { label: "Заезд", value: escapeHtml(formatDate(params.checkIn)) }
  ];
  if (params.hostPhone) rows.push({ label: "Телефон", value: escapeHtml(params.hostPhone) });

  const html = renderEmailLayout({
    title: "Напоминание о заезде",
    preheader: `Завтра заезд в ${params.hotelName}`,
    body: `
      ${emailTitle("Напоминание о заезде")}
      ${emailStatusBlock("info", "Завтра заезд", "Проверьте адрес и время заселения заранее.")}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(params.guestName)}</strong>!`)}
      ${emailDetailCard(rows)}
      ${emailButton("Написать хозяину", params.chatUrl)}
    `
  });

  await safeSend({
    to: params.guestEmail,
    subject: `TajStay: завтра заезд в ${params.hotelName}`,
    html
  });
}

export async function sendReviewRequestEmail(params: {
  guestEmail: string;
  guestName: string;
  hotelName: string;
  reviewUrl: string;
}) {
  const html = renderEmailLayout({
    title: "Оцените проживание",
    preheader: `Как прошло пребывание в ${params.hotelName}?`,
    body: `
      ${emailTitle("Как прошло пребывание?")}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(params.guestName)}</strong>!`)}
      ${emailParagraph(`Надеемся, вам понравилось в <strong>${escapeHtml(params.hotelName)}</strong>.`)}
      ${emailButton("Оставить отзыв", params.reviewUrl)}
      ${emailMuted("Ваш отзыв помогает другим путешественникам выбрать лучшее жильё.")}
    `
  });

  await safeSend({
    to: params.guestEmail,
    subject: `TajStay: оцените проживание в ${params.hotelName}`,
    html
  });
}

export { appBaseUrl };
