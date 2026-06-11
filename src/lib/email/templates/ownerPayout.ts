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

export type OwnerPayoutEmailInput = {
  ownerName: string;
  hotelName: string;
  bookingCode: string;
  amount: number;
  currency: string;
  dashboardUrl: string;
};

function formatMoney(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function renderOwnerPayoutEmail(input: OwnerPayoutEmailInput): string {
  return renderEmailLayout({
    title: "Выплата владельцу — TajStay",
    preheader: `Начислена выплата ${formatMoney(input.amount, input.currency)} по брони ${input.bookingCode}`,
    body: `
      ${emailTitle("Выплата сформирована")}
      ${emailStatusBlock(
        "info",
        "Статус: ожидает перевода",
        "Сумма зарезервирована после завершения бронирования и передана в очередь выплат."
      )}
      ${emailParagraph(`Здравствуйте, <strong>${escapeHtml(input.ownerName)}</strong>!`)}
      ${emailDetailCard([
        { label: "Объект", value: escapeHtml(input.hotelName) },
        { label: "Бронь", value: escapeHtml(input.bookingCode) },
        { label: "Сумма выплаты", value: escapeHtml(formatMoney(input.amount, input.currency)) }
      ])}
      ${emailButton("Открыть финансы", input.dashboardUrl)}
      ${emailMuted("Комиссия платформы уже учтена при расчёте суммы. Детали доступны в кабинете владельца.")}
    `
  });
}

export function ownerPayoutEmailSubject(amount: number, currency: string): string {
  return `TajStay: выплата ${formatMoney(amount, currency)}`;
}
