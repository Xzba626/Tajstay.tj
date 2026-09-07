import Link from "next/link";
import { PageContainer } from "@/components/ds";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

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
        action={
          <Link href={backHref} className="profile-subpage__back">
            {m(locale, "common.back")}
          </Link>
        }
      />
      <div className="profile-subpage__body">{children}</div>
    </PageContainer>
  );
}
