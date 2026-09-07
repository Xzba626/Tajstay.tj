import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  href?: string;
  icon?: LucideIcon;
  label: string;
  value?: string;
  badge?: string;
  disabled?: boolean;
};

/** Compact profile subpage row — matches hub navigation language. */
export function ProfileSubpageRow({ href, icon: Icon, label, value, badge, disabled }: Props) {
  const className = "profile-subpage-row";

  if (disabled || !href) {
    return (
      <div className={`${className} profile-subpage-row--disabled`}>
        {Icon ? <Icon size={17} className="profile-subpage-row__icon" aria-hidden /> : null}
        <span className="profile-subpage-row__label">{label}</span>
        {badge ? <span className="profile-subpage-row__badge">{badge}</span> : null}
        {value ? <span className="profile-subpage-row__value">{value}</span> : null}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {Icon ? <Icon size={17} className="profile-subpage-row__icon" aria-hidden /> : null}
      <span className="profile-subpage-row__label">{label}</span>
      {value ? <span className="profile-subpage-row__value">{value}</span> : null}
      <ChevronRight size={15} className="profile-subpage-row__chevron" aria-hidden />
    </Link>
  );
}

export function ProfileSubpageGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="profile-subpage-group">
      {title ? <h2 className="profile-subpage-group__title">{title}</h2> : null}
      <div className="profile-subpage-group__body">{children}</div>
    </section>
  );
}
