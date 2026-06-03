import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ForgotPasswordClient } from "./reset-client";

export default function ForgotPasswordPage({
  searchParams
}: {
  searchParams?: { email?: string };
}) {
  const locale = getLocale();
  const initialEmail = String(searchParams?.email ?? "");

  return (
    <ForgotPasswordClient
      locale={locale}
      initialEmail={initialEmail}
      labels={{
        step1Title: m(locale, "auth.passwordRecovery.step1Title"),
        step1Subtitle: m(locale, "auth.passwordRecovery.step1Subtitle"),
        emailLabel: m(locale, "auth.passwordRecovery.emailLabel"),
        continue: m(locale, "auth.passwordRecovery.continue"),
        step2Title: m(locale, "auth.passwordRecovery.step2Title"),
        step2SubtitlePrefix: m(locale, "auth.passwordRecovery.step2SubtitlePrefix"),
        changeEmail: m(locale, "auth.passwordRecovery.changeEmail"),
        step3Title: m(locale, "auth.passwordRecovery.step3Title"),
        step3Subtitle: m(locale, "auth.passwordRecovery.step3Subtitle"),
        passwordLabel: m(locale, "auth.passwordRecovery.passwordLabel"),
        confirmPasswordLabel: m(locale, "auth.passwordRecovery.confirmPasswordLabel"),
        savePassword: m(locale, "auth.passwordRecovery.savePassword"),
        successTitle: m(locale, "auth.passwordRecovery.successTitle"),
        successSubtitle: m(locale, "auth.passwordRecovery.successSubtitle"),
        signIn: m(locale, "auth.passwordRecovery.signIn"),
        invalidCode: m(locale, "auth.passwordRecovery.invalidCode"),
        expiredCode: m(locale, "auth.passwordRecovery.expiredCode"),
        codeTimer: m(locale, "auth.passwordRecovery.codeTimer"),
        requestNewCode: m(locale, "auth.passwordRecovery.requestNewCode"),
        passwordMismatch: m(locale, "auth.passwordRecovery.passwordMismatch"),
        errTooManyAttempts: m(locale, "auth.errTooManyAttempts"),
        strengthWeak: m(locale, "auth.passwordRecovery.strengthWeak"),
        strengthFair: m(locale, "auth.passwordRecovery.strengthFair"),
        strengthStrong: m(locale, "auth.passwordRecovery.strengthStrong"),
        confirmCode: m(locale, "auth.telegramVerify"),
        verifying: m(locale, "auth.telegramVerifying")
      }}
    />
  );
}
