import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";

export const dynamic = "force-dynamic";

export default async function ProfileDataPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/data");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.myData")} subtitle={m(locale, "profile.myDataSubtitle")}>
      <div className="profile-actions">
        <div className="profile-actions__item opacity-60">
          <span className="flex-1 text-sm font-medium">{m(locale, "profile.downloadData")}</span>
          <span className="premium-badge text-[10px]">{m(locale, "profile.comingSoon")}</span>
        </div>
        <Link href="/contacts" className="profile-actions__item">
          <span className="flex-1 text-sm font-medium">{m(locale, "profile.deleteAccount")}</span>
          <span className="text-[var(--text-muted)]">›</span>
        </Link>
        <Link href="/policy" className="profile-actions__item">
          <span className="flex-1 text-sm font-medium">{m(locale, "profile.actionsPolicy")}</span>
          <span className="text-[var(--text-muted)]">›</span>
        </Link>
        <Link href="/terms" className="profile-actions__item">
          <span className="flex-1 text-sm font-medium">{m(locale, "profile.consentManage")}</span>
          <span className="text-[var(--text-muted)]">›</span>
        </Link>
      </div>
    </ProfileSubpageShell>
  );
}
