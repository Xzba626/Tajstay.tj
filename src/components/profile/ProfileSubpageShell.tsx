import { PageContainer } from "@/components/ds";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileBackButton } from "@/components/profile/ProfileBackButton";

export function ProfileSubpageShell({
  locale,
  title,
  subtitle,
  backHref = "/profile",
  children
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <PageContainer width="narrow" className="profile-page-light profile-workspace ts-workspace-light pb-10">
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        action={<ProfileBackButton href={backHref} label={m(locale, "common.back")} />}
      />
      <div className="profile-subpage__body">{children}</div>
    </PageContainer>
  );
}
