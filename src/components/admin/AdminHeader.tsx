import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { AdminProfileMenu, type AdminProfileMenuLabels } from "@/components/admin/AdminProfileMenu";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
  brandPrimary: string;
  brandSecondary: string;
  brandFull: string;
  adminName: string;
  adminRoleLabel: string;
  unreadCount: number;
  notificationsHref: string;
  notificationsAria: string;
  profileLabels: AdminProfileMenuLabels;
};

/**
 * TajStay Admin authenticated header (ADM-3, mobile-header gap confirmed empty by BLOCK ADMIN 6.0
 * §26.10 live runtime — there was previously no header/logo at all in the Admin shell, desktop or
 * mobile). One component serves both breakpoints; CSS handles density, not two implementations.
 */
export function AdminHeader({
  locale: _locale,
  brandPrimary,
  brandSecondary,
  brandFull,
  adminName,
  adminRoleLabel,
  unreadCount,
  notificationsHref,
  notificationsAria,
  profileLabels
}: Props) {
  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        {/* 6.1A closure: at 320px "TajStay Admin" previously ellipsized to "TajStay A…" — a
         * truncated brand/context reads worse than a deliberately short one. The "Admin" word
         * is now a separate span, hidden below 380px via CSS instead of being cut mid-word;
         * `brandFull` carries the complete name for the link's accessible name/title. */}
        <Link href="/" className="admin-header__brand" title={brandFull} aria-label={brandFull}>
          <BrandMark showName={false} size="sm" />
          <span className="admin-header__brand-text">
            {brandPrimary}
            <span className="admin-header__brand-context"> {brandSecondary}</span>
          </span>
        </Link>

        <div className="admin-header__actions">
          <Link href={notificationsHref} className="admin-header__icon-btn" aria-label={notificationsAria}>
            <Bell className="h-[18px] w-[18px]" aria-hidden />
            {unreadCount > 0 ? (
              <span className="admin-header__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </Link>

          <AdminProfileMenu name={adminName} role={adminRoleLabel} labels={profileLabels} />
        </div>
      </div>
    </header>
  );
}
