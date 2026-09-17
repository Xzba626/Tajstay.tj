import { redirect } from "next/navigation";
import { KeyRound, Mail, Phone, Smartphone } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup, ProfileSubpageRow } from "@/components/profile/ProfileSubpageRow";
import { ProfileSessionsClient } from "@/components/profile/ProfileSessionsClient";

export const dynamic = "force-dynamic";

export default async function ProfileSecurityPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) redirect("/auth/sign-in?next=/profile/security");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.security")} subtitle={m(locale, "profile.securitySubtitle")}>
      <ProfileSubpageGroup title={m(locale, "profile.sectionAccount")}>
        <ProfileSubpageRow href="/profile/password" icon={KeyRound} label={m(locale, "profile.changePassword")} />
        <ProfileSubpageRow href="/profile/phone" icon={Phone} label={m(locale, "profile.changePhone")} />
        <ProfileSubpageRow href="/profile/email" icon={Mail} label={m(locale, "profile.changeEmail")} />
        <ProfileSubpageRow href="/profile/telegram" icon={Smartphone} label={m(locale, "profile.connectTelegram")} />
      </ProfileSubpageGroup>

      <ProfileSubpageGroup title={m(locale, "profile.activeDevices")}>
        <ProfileSessionsClient
          locale={locale}
          labels={{
            title: m(locale, "profile.activeDevices"),
            current: m(locale, "profile.sessionCurrent"),
            other: m(locale, "profile.sessionOther"),
            revokeOne: m(locale, "profile.sessionRevoke"),
            revokeOthers: m(locale, "profile.sessionRevokeOthers"),
            empty: m(locale, "profile.sessionEmpty"),
            loadError: m(locale, "profile.sessionLoadError"),
            revoked: m(locale, "profile.sessionRevoked")
          }}
        />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
