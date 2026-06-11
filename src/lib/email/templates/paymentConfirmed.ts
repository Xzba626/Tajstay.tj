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

export type PaymentConfirmedEmailInput = {
  guestName: string;
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  publicCode: string | null;
  dashboardUrl?: string;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function renderPaymentConfirmedEmail(input: PaymentConfirmedEmailInput): string {
  const code = input.publicCode ?? "—";
  const rows = [
    { label: "Номер брони", value: escapeHtml(code) },
    { label: "Объект", value: escapeHtml(input.hotelName) },
    { label: "Заезд", value: escapeHtml(formatDate(input.checkIn)) },
    { label: "Выезд", value: escapeHtml(formatDate(input.checkOut)) }
  ];

  return renderEmailLayout({
    title: "Оплата подтверждена — TajStay",
    preheader: `Оплата по брони ${code} подтверждена владельцем`,
    body: `
      ${emailTitle("Оплата подтверждена")}
      ${emailStatusBlock("success", "Платёж принят", "Владелец подтвердил получение оплаты. Бронирование активно.")}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(input.guestName)}</strong>! Спасибо — ваша оплата успешно подтверждена.`)}
      ${emailDetailCard(rows)}
      ${input.dashboardUrl ? emailButton("Открыть бронирование", input.dashboardUrl) : ""}
      ${emailMuted("Приятного пребывания! При вопросах используйте чат бронирования в личном кабинете.")}
    `
  });
}

export function paymentConfirmedEmailSubject(publicCode: string | null): string {
  return publicCode ? `TajStay: оплата по брони ${publicCode} подтверждена` : "TajStay: оплата подтверждена";
}
