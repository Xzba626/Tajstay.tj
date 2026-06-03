"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { m } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
  title: string;
  brandName: string;
  brandMarkUrl: string;
  unreadCount: number;
  adminName: string;
  adminImage: string | null;
};

export function AdminMobileHeader({
  locale,
  title,
  brandName,
  brandMarkUrl,
  unreadCount,
  adminName,
  adminImage
}: Props) {
  return (
    <header className="admin-mobile-header lg:hidden">
      <BrandMark
        href="/"
        name={brandName}
        markSrc={brandMarkUrl}
        size="sm"
        className="min-w-0 shrink"
        nameClassName="text-sm font-bold text-white sm:text-base"
      />

      <p className="admin-mobile-header__title" aria-hidden={title === brandName}>
        {title}
      </p>

      <div className="admin-mobile-header__actions">
        <Link
          href="/notifications"
          className="admin-mobile-header__icon-btn relative"
          aria-label={m(locale, "admin.mobileQuickNotifications")}
        >
          <Bell size={20} aria-hidden />
          {unreadCount > 0 ? (
            <span className="admin-mobile-header__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          ) : null}
        </Link>
        <Link href="/profile" className="admin-mobile-header__avatar" aria-label={m(locale, "userMenu.profile")}>
          <ProfileAvatar name={adminName} imageUrl={adminImage} size="sm" />
        </Link>
      </div>
    </header>
  );
}
