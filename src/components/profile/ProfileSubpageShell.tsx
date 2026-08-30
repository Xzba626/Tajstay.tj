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
    <PageContainer width="narrow" className="space-y-5 pb-10 profile-page-light">
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        action={
          <Link href={backHref} className="text-sm font-medium text-[var(--green-accent)]">
            {m(locale, "common.back")}
          </Link>
        }
      />
      {children}
    </PageContainer>
  );
}
