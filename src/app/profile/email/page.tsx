import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { maskEmail } from "@/lib/format/maskEmail";
import { ProfileEmailChangeClient } from "@/components/profile/ProfileEmailChangeClient";

export const dynamic = "force-dynamic";

export default async function ProfileEmailPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) redirect("/auth/sign-in?next=/profile/email");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const currentEmailDisplay = maskEmail(full.email) ?? m(locale, "profile.emailNotSet");

  return (
    <ProfileEmailChangeClient
      locale={locale}
      currentEmailDisplay={currentEmailDisplay}
      labels={{
        title: m(locale, "profile.email"),
        subtitle: m(locale, "profile.contactEmailSubtitle"),
        currentLabel: m(locale, "profile.emailChange.currentHint"),
        newLabel: m(locale, "profile.emailChange.newLabel"),
        codeLabel: m(locale, "profile.emailChange.codeLabel"),
        sendCode: m(locale, "profile.emailChange.sendCode"),
        verify: m(locale, "profile.emailChange.verify"),
        resend: m(locale, "profile.emailChange.resend"),
        success: m(locale, "profile.emailChange.success"),
        back: m(locale, "profile.emailChange.back"),
        errors: {
          invalid_email: m(locale, "profile.emailChange.errInvalid"),
          same_email: m(locale, "profile.emailChange.errSame"),
          email_taken: m(locale, "profile.emailChange.errTaken"),
          cooldown: m(locale, "profile.emailChange.errCooldown"),
          email_not_configured: m(locale, "profile.emailChange.errNotConfigured"),
          delivery_failed: m(locale, "profile.emailChange.errDelivery"),
          invalid_or_expired: m(locale, "profile.emailChange.errCode"),
          too_many_attempts: m(locale, "profile.emailChange.errAttempts"),
          rate_limited: m(locale, "profile.emailChange.errRate"),
          unauthorized: m(locale, "profile.emailChange.errAuth"),
          update_failed: m(locale, "profile.emailChange.errUpdate"),
          invalid_input: m(locale, "profile.emailChange.errCode"),
          generic: m(locale, "profile.emailChange.errGeneric")
        }
      }}
    />
  );
}
