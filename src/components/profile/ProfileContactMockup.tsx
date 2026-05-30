import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  value: string;
  hint: string;
  actionHref: string;
  actionLabel: string;
  verified?: boolean;
  verifiedLabel?: string;
};

export function ProfileContactMockup({
  locale,
  title,
  subtitle,
  icon: Icon,
  value,
  hint,
  actionHref,
  actionLabel,
  verified,
  verifiedLabel
}: Props) {
  return (
    <ProfileSubpageShell locale={locale} title={title} subtitle={subtitle}>
      <div className="mockup-contact">
        <div className="mockup-contact__icon" aria-hidden>
          <Icon size={32} strokeWidth={1.5} />
        </div>
        <div className="mockup-contact__value">{value}</div>
        {verified && verifiedLabel ? (
          <div className="mockup-contact__badge">{verifiedLabel}</div>
        ) : null}
        <p className="mockup-contact__hint">{hint}</p>
        <Link href={actionHref} className="btn-primary mt-2 inline-flex !w-full max-w-xs">
          {actionLabel}
        </Link>
      </div>
    </ProfileSubpageShell>
  );
}
