import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";

export const dynamic = "force-dynamic";

export default async function ProfileSecurityPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/security");

  const items = [
    { href: "/auth/forgot-password", label: m(locale, "profile.changePassword"), available: true },
    { href: "/profile/personal", label: m(locale, "profile.changePhone"), available: true },
    { href: "/profile/personal", label: m(locale, "profile.changeEmail"), available: true },
    { href: "#", label: m(locale, "profile.twoFactor"), available: false },
    { href: "#", label: m(locale, "profile.activeDevices"), available: false },
    { href: "#", label: m(locale, "profile.loginHistory"), available: false }
  ];

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.security")} subtitle={m(locale, "profile.securitySubtitle")}>
      <div className="profile-actions">
        {items.map((item) =>
          item.available ? (
            <Link key={item.label} href={item.href} className="profile-actions__item">
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              <span className="text-[var(--text-muted)]">›</span>
            </Link>
          ) : (
            <div key={item.label} className="profile-actions__item opacity-60">
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              <span className="premium-badge text-[10px]">{m(locale, "profile.comingSoon")}</span>
            </div>
          )
        )}
      </div>
    </ProfileSubpageShell>
  );
}
