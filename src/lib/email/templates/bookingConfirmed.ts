import {
  emailButton,
  emailDetailCard,
  emailMuted,
  emailParagraph,
  emailStatusBlock,
  emailTitle
} from "@/lib/email/templates/components";
import { escapeHtml } from "@/lib/email/templates/escape";
import { renderEmailLayout } from "@/lib/email/templates/layout";

export type BookingConfirmedEmailInput = {
  guestName: string;
  hotelName: string;
  hotelAddress: string;
  checkIn: Date;
  checkOut: Date;
  bookingCode?: string | null;
  hostPhone?: string;
  chatUrl: string;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function renderBookingConfirmedEmail(input: BookingConfirmedEmailInput): string {
  const rows = [
    { label: "Объект", value: escapeHtml(input.hotelName) },
    { label: "Адрес", value: escapeHtml(input.hotelAddress) },
    { label: "Заезд", value: escapeHtml(formatDate(input.checkIn)) },
    { label: "Выезд", value: escapeHtml(formatDate(input.checkOut)) }
  ];
  if (input.bookingCode) rows.unshift({ label: "Номер брони", value: escapeHtml(input.bookingCode) });
  if (input.hostPhone) rows.push({ label: "Телефон хозяина", value: escapeHtml(input.hostPhone) });

  return renderEmailLayout({
    title: "Бронирование подтверждено — TajStay",
    preheader: `Ваша бронь в ${input.hotelName} подтверждена`,
    body: `
      ${emailTitle("Бронирование подтверждено")}
      ${emailStatusBlock("success", "Статус: подтверждено", "Хозяин принял вашу бронь. Мы ждём вас в указанные даты.")}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(input.guestName)}</strong>! Детали проживания ниже.`)}
      ${emailDetailCard(rows)}
      ${emailButton("Написать хозяину", input.chatUrl)}
      ${emailMuted("Сохраните это письмо — оно содержит важную информацию о поездке.")}
    `
  });
}

export function bookingConfirmedEmailSubject(bookingCode?: string | null): string {
  return bookingCode ? `TajStay: бронь ${bookingCode} подтверждена` : "TajStay: бронирование подтверждено";
}
