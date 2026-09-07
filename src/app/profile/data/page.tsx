import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ScrollText, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup, ProfileSubpageRow } from "@/components/profile/ProfileSubpageRow";

export const dynamic = "force-dynamic";

export default async function ProfileDataPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/data");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.myData")} subtitle={m(locale, "profile.myDataSubtitle")}>
      <ProfileSubpageGroup title={m(locale, "profile.sectionAccount")}>
        <ProfileSubpageRow
          icon={FileText}
          label={m(locale, "profile.downloadData")}
          badge={m(locale, "profile.comingSoon")}
          disabled
        />
        <ProfileSubpageRow href="/contacts" icon={Trash2} label={m(locale, "profile.deleteAccount")} />
      </ProfileSubpageGroup>

      <ProfileSubpageGroup title={m(locale, "profile.sectionSupport")}>
        <ProfileSubpageRow href="/policy" icon={FileText} label={m(locale, "profile.actionsPolicy")} />
        <ProfileSubpageRow href="/terms" icon={ScrollText} label={m(locale, "profile.consentManage")} />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
