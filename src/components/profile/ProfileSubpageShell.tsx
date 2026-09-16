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
    <PageContainer width="narrow" className="profile-page-light profile-workspace ts-workspace-light">
      {/* SECURITY CORRECTION BLOCK, Section 1/2: `pb-10` used to sit here as one of three stacked
          bottom-nav-clearance mechanisms (see profile-center.css's .profile-page-light min-height
          comment and workspace-mobile-shell.css). `main`'s own padding + the corrected min-height
          formula already reserve exact clearance for the header and the app tab bar, so this was
          pure extra padding on top of content that already fit — confirmed live: it alone produced
          a 42px phantom scroll range at 320x568 even after the other two redundant paddings were
          removed. Deleted rather than shrunk, matching the "one clearance mechanism" fix. */}
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        action={<ProfileBackButton href={backHref} label={m(locale, "common.back")} />}
      />
      <div className="profile-subpage__body">{children}</div>
    </PageContainer>
  );
}
