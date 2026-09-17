import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSessionsClient } from "@/components/profile/ProfileSessionsClient";

export const dynamic = "force-dynamic";

export default async function ProfileSessionsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) redirect("/auth/sign-in?next=/profile/sessions");

  return (
    <ProfileSubpageShell
      locale={locale}
      title={m(locale, "profile.activeDevices")}
      subtitle={m(locale, "profile.sessionsSubtitle")}
    >
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
    </ProfileSubpageShell>
  );
}
