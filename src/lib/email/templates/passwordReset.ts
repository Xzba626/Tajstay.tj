import {
  emailMuted,
  emailOtpBlock,
  emailParagraph,
  emailStatusBlock,
  emailTitle
} from "@/lib/email/templates/components";
import { formatOtpDisplay } from "@/lib/email/templates/escape";
import { renderEmailLayout } from "@/lib/email/templates/layout";

export function renderPasswordResetEmail(code: string): string {
  const codeDisplay = formatOtpDisplay(code);
  return renderEmailLayout({
    title: "Восстановление пароля — TajStay",
    preheader: `Код для восстановления доступа: ${codeDisplay}`,
    body: `
      ${emailTitle("Восстановление пароля")}
      ${emailParagraph("Используйте одноразовый код ниже, чтобы безопасно восстановить доступ к аккаунту TajStay.")}
      ${emailOtpBlock(codeDisplay, "Код подтверждения")}
      ${emailStatusBlock("warning", "Код действует 10 минут", "После истечения срока запросите новый код на странице восстановления пароля.")}
      ${emailMuted("Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш аккаунт останется в безопасности.")}
    `
  });
}
