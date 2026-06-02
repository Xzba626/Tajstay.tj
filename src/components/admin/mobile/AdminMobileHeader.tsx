"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

type Props = {
  locale: Locale;
  title: string;
  unreadCount: number;
  adminName: string;
  adminImage: string | null;
  onOpenDrawer: () => void;
};

export function AdminMobileHeader({ locale, title, unreadCount, adminName, adminImage, onOpenDrawer }: Props) {
  return (
    <header className="admin-mobile-header lg:hidden">
      <button
        type="button"
        className="admin-mobile-header__icon-btn"
        aria-label={m(locale, "admin.mobileNav")}
        onClick={onOpenDrawer}
      >
        <Menu size={22} aria-hidden />
      </button>

      <h1 className="admin-mobile-header__title">{title}</h1>

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
