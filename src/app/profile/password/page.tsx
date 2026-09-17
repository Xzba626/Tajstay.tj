import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfilePasswordChangeClient } from "@/components/profile/ProfilePasswordChangeClient";

export const dynamic = "force-dynamic";

export default async function ProfilePasswordPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) redirect("/auth/sign-in?next=/profile/password");

  return (
    <ProfilePasswordChangeClient
      locale={locale}
      labels={{
        title: m(locale, "profile.changePassword"),
        subtitle: m(locale, "profile.passwordChangeSubtitle"),
        current: m(locale, "profile.passwordCurrent"),
        next: m(locale, "profile.passwordNew"),
        confirm: m(locale, "profile.passwordConfirm"),
        submit: m(locale, "profile.passwordSubmit"),
        success: m(locale, "profile.passwordChanged"),
        errors: {
          bad_password: m(locale, "profile.passwordErrorBad"),
          weak_password: m(locale, "profile.passwordErrorWeak"),
          mismatch: m(locale, "profile.passwordErrorMismatch"),
          same_password: m(locale, "profile.passwordErrorSame"),
          failed: m(locale, "profile.passwordErrorFailed")
        }
      }}
    />
  );
}
