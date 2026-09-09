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
  /** No working change flow exists yet server-side — show an honest disabled state
      instead of a dead link (see .agent/STATE.md dependency audit). */
  blocked?: boolean;
  blockedLabel?: string;
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
  verifiedLabel,
  blocked,
  blockedLabel
}: Props) {
  return (
    <ProfileSubpageShell locale={locale} title={title} subtitle={subtitle}>
      <div className="profile-subpage-contact">
        <div className="profile-subpage-contact__icon" aria-hidden>
          <Icon size={32} strokeWidth={1.5} />
        </div>
        <div className="profile-subpage-contact__value">{value}</div>
        {verified && verifiedLabel ? (
          <div className="profile-subpage-contact__badge">{verifiedLabel}</div>
        ) : null}
        <p className="profile-subpage-contact__hint">{hint}</p>
        {blocked ? (
          <button type="button" disabled className="profile-subpage-contact__action" aria-disabled="true">
            {blockedLabel ?? actionLabel}
          </button>
        ) : (
          <Link href={actionHref} className="profile-subpage-contact__action">
            {actionLabel}
          </Link>
        )}
      </div>
    </ProfileSubpageShell>
  );
}
