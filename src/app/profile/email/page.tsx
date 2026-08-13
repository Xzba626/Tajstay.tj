import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { maskEmail } from "@/lib/format/maskEmail";
import { ProfileContactMockup } from "@/components/profile/ProfileContactMockup";

export const dynamic = "force-dynamic";

export default async function ProfileEmailPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/email");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const value = maskEmail(full.email) ?? m(locale, "profile.emailNotSet");
  const verified = Boolean(full.emailVerified || (full.email?.trim() && full.verified));

  return (
    <ProfileContactMockup
      locale={locale}
      title={m(locale, "profile.email")}
      subtitle={m(locale, "profile.contactEmailSubtitle")}
      icon={Mail}
      value={value}
      hint={m(locale, "profile.contactEmailHint")}
      actionHref="/profile/personal"
      actionLabel={m(locale, "profile.changeEmail")}
      verified={Boolean(full.email) && verified}
      verifiedLabel={m(locale, "profile.statusVerified")}
    />
  );
}
