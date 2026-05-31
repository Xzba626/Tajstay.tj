import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";

export const dynamic = "force-dynamic";

export default async function ProfileSecurityPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/security");

  const items = [
    { label: m(locale, "profile.activeDevices"), available: false },
    { label: m(locale, "profile.loginHistory"), available: false }
  ];

  return (
    <PageContainer width="narrow" className="pb-10">
      <div className="mockup-screen">
        <Link href="/profile" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
          ← {m(locale, "common.back")}
        </Link>
        <h1 className="mockup-screen__title">{m(locale, "profile.security")}</h1>
        <p className="mockup-screen__subtitle">{m(locale, "profile.securitySubtitle")}</p>
        <div className="profile-actions mt-4">
          {items.map((item) => (
            <div key={item.label} className="profile-actions__item opacity-60">
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              <span className="premium-badge text-[10px]">{m(locale, "profile.comingSoon")}</span>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
