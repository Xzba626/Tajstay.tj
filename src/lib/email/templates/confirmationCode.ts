import {
  emailMuted,
  emailOtpBlock,
  emailParagraph,
  emailStatusBlock,
  emailTitle
} from "@/lib/email/templates/components";
import { escapeHtml, formatOtpDisplay } from "@/lib/email/templates/escape";
import { renderEmailLayout } from "@/lib/email/templates/layout";

export type ConfirmationCodeEmailVariant = "change_email" | "verify_action";

const COPY: Record<
  ConfirmationCodeEmailVariant,
  { title: string; lead: string; subject: string; preheader: string }
> = {
  change_email: {
    title: "Подтверждение нового email",
    lead: "Введите код ниже, чтобы подтвердить смену адреса электронной почты в TajStay.",
    subject: "Код подтверждения — TajStay",
    preheader: "Код для смены email"
  },
  verify_action: {
    title: "Код подтверждения",
    lead: "Используйте код ниже для подтверждения действия в аккаунте TajStay.",
    subject: "Код подтверждения — TajStay",
    preheader: "Ваш код подтверждения TajStay"
  }
};

export function renderConfirmationCodeEmail(
  code: string,
  variant: ConfirmationCodeEmailVariant = "verify_action"
): string {
  const copy = COPY[variant];
  const codeDisplay = formatOtpDisplay(code);
  return renderEmailLayout({
    title: copy.subject,
    preheader: `${copy.preheader}: ${codeDisplay}`,
    body: `
      ${emailTitle(copy.title)}
      ${emailParagraph(copy.lead)}
      ${emailOtpBlock(codeDisplay, "Одноразовый код")}
      ${emailStatusBlock("info", "Срок действия — 10 минут", "Никому не сообщайте этот код. Сотрудники TajStay никогда не запрашивают его по телефону или в мессенджерах.")}
      ${emailMuted("Если вы не инициировали это действие, немедленно смените пароль и свяжитесь с поддержкой.")}
    `
  });
}

export function confirmationCodeEmailSubject(variant: ConfirmationCodeEmailVariant = "verify_action"): string {
  return COPY[variant].subject;
}
