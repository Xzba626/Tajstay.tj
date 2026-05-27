import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ResetPasswordClient } from "./reset-password-client";
import { EmailResetPasswordClient } from "./email-reset-client";

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams?: { token?: string; email?: string };
}) {
  const locale = getLocale();
  const token = String(searchParams?.token ?? "");
  const email = String(searchParams?.email ?? "");

  // Backward-compatible: keep token flow for admin-generated links.
  if (token.trim()) {
    return (
      <ResetPasswordClient
        locale={locale}
        token={token}
        labels={{
          title: m(locale, "resetPassword.title"),
          subtitle: m(locale, "resetPassword.subtitle"),
          password: m(locale, "auth.password"),
          passwordPlaceholder: m(locale, "auth.passwordPlaceholder"),
          save: m(locale, "resetPassword.save"),
          invalid: m(locale, "resetPassword.invalid"),
          success: m(locale, "resetPassword.success"),
          goSignIn: m(locale, "resetPassword.goSignIn")
        }}
      />
    );
  }

  return (
    <EmailResetPasswordClient
      locale={locale}
      email={email}
      labels={{
        title: m(locale, "auth.resetPassword.title"),
        emailLabel: m(locale, "auth.resetPassword.emailLabel"),
        codeLabel: m(locale, "auth.resetPassword.codeLabel"),
        passwordLabel: m(locale, "auth.resetPassword.passwordLabel"),
        confirmPasswordLabel: m(locale, "auth.resetPassword.confirmPasswordLabel"),
        submit: m(locale, "auth.resetPassword.submit"),
        success: m(locale, "auth.resetPassword.success"),
        invalidCode: m(locale, "auth.resetPassword.invalidCode"),
        expiredCode: m(locale, "auth.resetPassword.expiredCode"),
        passwordMismatch: m(locale, "auth.resetPassword.passwordMismatch"),
        goSignIn: m(locale, "auth.resetPassword.goSignIn")
      }}
    />
  );
}

