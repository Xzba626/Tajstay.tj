import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ResetPasswordClient } from "./reset-password-client";

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams?: { token?: string; email?: string };
}) {
  const locale = getLocale();
  const token = String(searchParams?.token ?? "");
  const email = String(searchParams?.email ?? "").trim();

  if (!token.trim()) {
    const q = email ? `?email=${encodeURIComponent(email)}` : "";
    redirect(`/auth/forgot-password${q}`);
  }

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
