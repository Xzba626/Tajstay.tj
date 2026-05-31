import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";
import { ProfileSettingsClient } from "@/components/profile/ProfileSettingsClient";
import { defaultCurrencyForLocale, type CurrencyCode } from "@/lib/profile/localeDefaults";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/settings");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const currency = (full.preferredCurrency as CurrencyCode | null) ?? defaultCurrencyForLocale(locale);

  return (
    <PageContainer width="narrow" className="pb-10">
      <div className="mockup-screen">
        <Link href="/profile" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
          ← {m(locale, "common.back")}
        </Link>
        <h1 className="mockup-screen__title">{m(locale, "profile.settings")}</h1>
        <p className="mockup-screen__subtitle">{m(locale, "profile.settingsSubtitle")}</p>
        <div className="mt-4">
          <ProfileSettingsClient
            locale={locale}
            initialCurrency={currency}
            initialTheme={full.preferredTheme ?? "system"}
          />
        </div>
      </div>
    </PageContainer>
  );
}
