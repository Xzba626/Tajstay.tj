"use client";

import Link from "next/link";
import { Bell, Building2, ChevronRight, CircleHelp, Globe, LayoutDashboard, Shield, User, type LucideIcon } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileLogoutConfirm } from "@/components/profile/ProfileLogoutConfirm";
import { maskPhone } from "@/lib/format/maskPhone";
import { maskEmail } from "@/lib/format/maskEmail";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";

type UserFull = {
  name: string;
  role: string;
  phone: string;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: Date | null;
  verified: boolean;
  telegramUsername: string | null;
  telegramId: string | null;
  image: string | null;
  telegramPhotoUrl: string | null;
  favoritesCount: number;
  bookingsCount: number;
};

type Props = {
  locale: Locale;
  user: UserFull;
  logoutLabel: string;
  unreadNotifications?: number;
};

function HubGroupLabel({ children }: { children: string }) {
  return <p className="profile-hub__group-label">{children}</p>;
}

function HubNavBlock({
  href,
  icon: Icon,
  title,
  summary,
  badge
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  badge?: number;
}) {
  return (
    <Link href={href} className="profile-hub__nav-block">
      <Icon size={18} className="profile-hub__nav-block-icon" aria-hidden />
      <span className="profile-hub__nav-block-copy">
        <span className="profile-hub__nav-block-title">{title}</span>
        <span className="profile-hub__nav-block-summary">{summary}</span>
      </span>
      {badge && badge > 0 ? <span className="profile-hub__row-badge">{badge > 99 ? "99+" : badge}</span> : null}
      <ChevronRight size={16} className="profile-hub__nav-block-chevron" aria-hidden />
    </Link>
  );
}

// Compact, role-aware Profile root. Previously this screen opened with a giant identity card
// (avatar/name/role/verification badges/edit pencil) that fully duplicated "Личная информация",
// plus a History/Favorites counter grid that duplicated bottom-nav destinations and made no sense
// for Admin/Owner accounts, plus a separate "Подписки" row that overlapped Notification settings.
// Product decision: this screen should read like an app settings screen — one canonical place per
// piece of information, minimal height, role-aware content — not a personal-cabinet web page.
export function ProfileMockupView({ locale, user, logoutLabel, unreadNotifications = 0 }: Props) {
  const hasPhone = Boolean(user.phone && !isPlaceholderAccountPhone(user.phone));
  const phoneShort = hasPhone ? maskPhone(user.phone) : m(locale, "profile.phoneNotSet");
  const emailShort = maskEmail(user.email) ?? m(locale, "profile.emailNotSet");

  const roleLabel =
    user.role === "OWNER"
      ? m(locale, "profile.roleOwner")
      : user.role === "ADMIN"
        ? m(locale, "profile.roleAdmin")
        : user.role === "GUEST"
          ? m(locale, "profile.roleGuest")
          : null;

  return (
    <div className="profile-hub profile-center profile-hub--compact">
      <header className="profile-hub__compact-head">
        <h1 className="profile-hub__compact-title">{m(locale, "profile.title")}</h1>
        {roleLabel ? <p className="profile-hub__compact-subtitle">{user.name} · {roleLabel}</p> : null}
      </header>

      <div className="profile-hub__stack">
        <HubGroupLabel>{m(locale, "profile.sectionAccount")}</HubGroupLabel>
        <div className="profile-hub__nav-group">
          <HubNavBlock
            href="/profile/personal"
            icon={User}
            title={m(locale, "profile.personalInfo")}
            summary={`${phoneShort} · ${emailShort}`}
          />
          <HubNavBlock
            href="/profile/security"
            icon={Shield}
            title={m(locale, "profile.security")}
            summary={m(locale, "profile.securitySubtitle")}
          />
          <HubNavBlock
            href="/profile/settings"
            icon={Globe}
            title={m(locale, "profile.settings")}
            summary={m(locale, "profile.settingsSubtitle")}
          />
          <HubNavBlock
            href="/notifications"
            icon={Bell}
            title={m(locale, "profile.notificationSettings")}
            summary={m(locale, "profile.notificationSettingsSubtitle")}
            badge={unreadNotifications}
          />
        </div>

        {user.role !== "GUEST" ? (
          <>
            <HubGroupLabel>{m(locale, "profile.sectionRole")}</HubGroupLabel>
            <div className="profile-hub__nav-group">
              {user.role === "OWNER" ? (
                <HubNavBlock
                  href="/dashboard/owner"
                  icon={Building2}
                  title={m(locale, "profile.navOwner")}
                  summary={m(locale, "profile.navOwnerSubtitle")}
                />
              ) : null}
              {user.role === "ADMIN" ? (
                <HubNavBlock
                  href="/dashboard/admin"
                  icon={LayoutDashboard}
                  title={m(locale, "profile.navAdmin")}
                  summary={m(locale, "profile.navAdminSubtitle")}
                />
              ) : null}
            </div>
          </>
        ) : null}

        <HubGroupLabel>{m(locale, "profile.sectionSupport")}</HubGroupLabel>
        <div className="profile-hub__nav-group">
          <HubNavBlock
            href="/profile/support"
            icon={CircleHelp}
            title={m(locale, "profile.sectionSupport")}
            summary={m(locale, "profile.actionsHelp")}
          />
        </div>

        {user.role === "GUEST" ? (
          <Link href="/profile/become-owner" className="profile-hub__promo">
            <span className="profile-hub__promo-title">{m(locale, "profile.hostBannerTitle")}</span>
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}

        <ProfileLogoutConfirm
          label={logoutLabel}
          confirmText={m(locale, "profile.logoutConfirm")}
          confirmYes={m(locale, "profile.logoutConfirmYes")}
          confirmCancel={m(locale, "profile.logoutConfirmCancel")}
        />
      </div>
    </div>
  );
}
