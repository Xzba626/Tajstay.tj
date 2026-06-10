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

export type BookingCancelledBy = "guest" | "host" | "admin" | "system";

const CANCELLER: Record<BookingCancelledBy, string> = {
  guest: "гостем",
  host: "владельцем объекта",
  admin: "службой поддержки TajStay",
  system: "автоматически"
};

export type BookingCancelledEmailInput = {
  name: string;
  bookingCode: string;
  hotelName: string;
  cancelledBy: BookingCancelledBy;
  reason?: string;
  searchUrl: string;
};

export function renderBookingCancelledEmail(input: BookingCancelledEmailInput): string {
  const rows = [
    { label: "Номер брони", value: escapeHtml(input.bookingCode) },
    { label: "Объект", value: escapeHtml(input.hotelName) },
    { label: "Отменено", value: escapeHtml(CANCELLER[input.cancelledBy]) }
  ];
  if (input.reason?.trim()) {
    rows.push({ label: "Причина", value: escapeHtml(input.reason.trim()) });
  }

  return renderEmailLayout({
    title: `Бронь ${input.bookingCode} отменена — TajStay`,
    preheader: `Бронирование в ${input.hotelName} отменено`,
    body: `
      ${emailTitle("Бронирование отменено")}
      ${emailStatusBlock("danger", "Статус: отменено", `Бронь была отменена ${CANCELLER[input.cancelledBy]}.`)}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(input.name)}</strong>.`)}
      ${emailDetailCard(rows)}
      ${emailButton("Найти другое жильё", input.searchUrl)}
      ${emailMuted("Если отмена произошла по ошибке, свяжитесь с поддержкой TajStay через личный кабинет.")}
    `
  });
}

export function bookingCancelledEmailSubject(bookingCode: string): string {
  return `TajStay: бронь ${bookingCode} отменена`;
}
