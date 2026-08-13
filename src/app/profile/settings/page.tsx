import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { localeLabels } from "@/lib/i18n/locale";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { SettingsLanguageList } from "@/components/profile/SettingsLanguageList";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/settings");

  const rows = [
    { label: m(locale, "profile.language"), value: localeLabels[locale], href: null as string | null },
    { label: m(locale, "profile.settingsCurrency"), value: m(locale, "profile.settingsCurrencyValue"), href: null },
    { label: m(locale, "profile.settingsTheme"), value: m(locale, "profile.settingsThemeValue"), href: null },
    { label: m(locale, "profile.settingsPrivacy"), value: "", href: "/policy" },
    { label: m(locale, "profile.actionsHelp"), value: "", href: "/faq" },
    { label: m(locale, "profile.aboutApp"), value: "v1.0.0", href: "/about" }
  ];

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.settings")} subtitle={m(locale, "profile.settingsSubtitle")}>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {m(locale, "profile.language")}
        </h2>
        <SettingsLanguageList current={locale} />
      </section>

      <nav className="mockup-menu mt-6" aria-label={m(locale, "profile.settings")}>
        {rows.slice(1).map((row) =>
          row.href ? (
            <Link key={row.label} href={row.href} className="mockup-menu__item">
              <span>{row.label}</span>
              {row.value ? <span className="mockup-menu__value">{row.value}</span> : null}
            </Link>
          ) : (
            <div key={row.label} className="mockup-menu__item cursor-default">
              <span>{row.label}</span>
              <span className="mockup-menu__value">{row.value}</span>
            </div>
          )
        )}
      </nav>
    </ProfileSubpageShell>
  );
}
