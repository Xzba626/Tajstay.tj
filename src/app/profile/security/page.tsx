import { redirect } from "next/navigation";
import { KeyRound, Mail, Phone, Shield, Smartphone } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup, ProfileSubpageRow } from "@/components/profile/ProfileSubpageRow";

export const dynamic = "force-dynamic";

export default async function ProfileSecurityPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/security");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.security")} subtitle={m(locale, "profile.securitySubtitle")}>
      <ProfileSubpageGroup title={m(locale, "profile.sectionAccount")}>
        <ProfileSubpageRow href="/auth/forgot-password" icon={KeyRound} label={m(locale, "profile.changePassword")} />
        <ProfileSubpageRow href="/profile/phone" icon={Phone} label={m(locale, "profile.changePhone")} />
        <ProfileSubpageRow href="/profile/email" icon={Mail} label={m(locale, "profile.changeEmail")} />
      </ProfileSubpageGroup>

      <ProfileSubpageGroup title={m(locale, "profile.comingSoon")}>
        <ProfileSubpageRow icon={Shield} label={m(locale, "profile.twoFactor")} badge={m(locale, "profile.comingSoon")} disabled />
        <ProfileSubpageRow icon={Smartphone} label={m(locale, "profile.activeDevices")} badge={m(locale, "profile.comingSoon")} disabled />
        <ProfileSubpageRow icon={KeyRound} label={m(locale, "profile.loginHistory")} badge={m(locale, "profile.comingSoon")} disabled />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
