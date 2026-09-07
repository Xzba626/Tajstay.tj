import { redirect } from "next/navigation";
import { CircleHelp, FileText, Globe, MessageCircle, ScrollText, Shield } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { localeLabels } from "@/lib/i18n/locale";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup, ProfileSubpageRow } from "@/components/profile/ProfileSubpageRow";
import { SettingsLanguageList } from "@/components/profile/SettingsLanguageList";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/settings");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.settings")} subtitle={m(locale, "profile.settingsSubtitle")}>
      <ProfileSubpageGroup title={m(locale, "profile.sectionApp")}>
        <SettingsLanguageList current={locale} />
        <ProfileSubpageRow label={m(locale, "profile.language")} value={localeLabels[locale]} />
        <ProfileSubpageRow label={m(locale, "profile.settingsCurrency")} value={m(locale, "profile.settingsCurrencyValue")} />
        <ProfileSubpageRow label={m(locale, "profile.settingsTheme")} value={m(locale, "profile.settingsThemeValue")} />
      </ProfileSubpageGroup>

      <ProfileSubpageGroup title={m(locale, "profile.sectionAccount")}>
        <ProfileSubpageRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
        <ProfileSubpageRow href="/profile/subscriptions" icon={Globe} label={m(locale, "profile.subscriptions")} />
      </ProfileSubpageGroup>

      <ProfileSubpageGroup title={m(locale, "profile.sectionSupport")}>
        <ProfileSubpageRow href="/policy" icon={FileText} label={m(locale, "profile.settingsPrivacy")} />
        <ProfileSubpageRow href="/faq" icon={CircleHelp} label={m(locale, "profile.actionsHelp")} />
        <ProfileSubpageRow href="/contacts" icon={MessageCircle} label={m(locale, "footer.contactUs")} />
        <ProfileSubpageRow href="/terms" icon={ScrollText} label={m(locale, "footer.terms")} />
        <ProfileSubpageRow href="/about" label={m(locale, "profile.aboutApp")} value="v1.0.0" />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
