import { emailButton, emailMuted, emailParagraph, emailStatusBlock, emailTitle } from "@/lib/email/templates/components";
import { renderEmailLayout } from "@/lib/email/templates/layout";

export function renderEmailVerificationEmail(verifyUrl: string): string {
  return renderEmailLayout({
    title: "Подтвердите email — TajStay",
    preheader: "Подтвердите адрес электронной почты для аккаунта TajStay",
    body: `
      ${emailTitle("Подтвердите email")}
      ${emailStatusBlock("info", "Требуется подтверждение", "Это помогает защитить ваш аккаунт и восстановить доступ при необходимости.")}
      ${emailParagraph("Нажмите кнопку ниже, чтобы подтвердить адрес электронной почты.")}
      ${emailButton("Подтвердить email", verifyUrl)}
      ${emailMuted("Ссылка действительна 24 часа. Если вы не регистрировались на TajStay — проигнорируйте письмо.")}
    `
  });
}
