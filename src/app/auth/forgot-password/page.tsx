import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ForgotPasswordClient } from "./reset-client";

export default function ForgotPasswordPage() {
  const locale = getLocale();
  return (
    <ForgotPasswordClient
      locale={locale}
      labels={{
        title: m(locale, "auth.forgotPassword.title"),
        description: m(locale, "auth.forgotPassword.description"),
        emailLabel: m(locale, "auth.forgotPassword.emailLabel"),
        submit: m(locale, "auth.forgotPassword.submit"),
        success: m(locale, "auth.forgotPassword.success"),
        enterCode: m(locale, "auth.forgotPassword.enterCode")
      }}
    />
  );
}

