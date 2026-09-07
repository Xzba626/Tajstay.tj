"use client";

import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe,
  Heart,
  History,
  Megaphone,
  MessageCircle,
  Pencil,
  ScrollText,
  Shield,
  User,
  type LucideIcon
} from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
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
  favorites: unknown[];
  bookings: unknown[];
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

export function ProfileMockupView({ locale, user, logoutLabel, unreadNotifications = 0 }: Props) {
  const hasPhone = Boolean(user.phone && !isPlaceholderAccountPhone(user.phone));
  const phoneShort = hasPhone ? maskPhone(user.phone) : m(locale, "profile.phoneNotSet");
  const emailShort = maskEmail(user.email) ?? m(locale, "profile.emailNotSet");
  const emailOk = Boolean(user.email && user.emailVerified);
  const phoneOk = Boolean(hasPhone && user.phoneVerified);
  const nameParts = user.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? user.name;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "—";

  const roleLabel =
    user.role === "OWNER"
      ? m(locale, "profile.roleOwner")
      : user.role === "ADMIN"
        ? m(locale, "profile.roleAdmin")
        : user.role === "GUEST"
          ? m(locale, "profile.roleGuest")
          : null;

  return (
    <div className="profile-hub profile-center">
      <header className="profile-hub__identity">
        <div className="profile-hub__identity-row">
          <ProfileAvatar
            name={user.name}
            imageUrl={user.image ?? user.telegramPhotoUrl}
            size="md"
            className="profile-hub__avatar"
          />
          <div className="profile-hub__identity-main">
            <p className="profile-hub__name-line">
              <span className="profile-hub__firstname">{firstName}</span>
              {lastName !== "—" ? <span className="profile-hub__lastname">{lastName}</span> : null}
            </p>
            {roleLabel ? <p className="profile-hub__role">{roleLabel}</p> : null}
            <div className="profile-hub__badges">
              {emailOk ? (
                <span className="profile-hub__badge profile-hub__badge--ok">{m(locale, "profile.emailVerifiedBadge")}</span>
              ) : (
                <Link href="/profile/email" className="profile-hub__badge profile-hub__badge--warn">
                  {m(locale, "profile.emailVerifyPrompt")}
                </Link>
              )}
              {phoneOk ? (
                <span className="profile-hub__badge profile-hub__badge--ok">{m(locale, "profile.phoneVerified")}</span>
              ) : (
                <Link href="/profile/phone" className="profile-hub__badge profile-hub__badge--warn">
                  {m(locale, "profile.phoneVerifyPrompt")}
                </Link>
              )}
            </div>
          </div>
          <Link href="/profile/personal" className="profile-hub__edit" aria-label={m(locale, "profile.editProfile")}>
            <Pencil size={16} aria-hidden />
          </Link>
        </div>
      </header>

      <div className="profile-hub__stack">
        <HubGroupLabel>{m(locale, "profile.sectionMain")}</HubGroupLabel>
        <div className="profile-hub__activity-grid">
          <Link href="/history" className="profile-hub__activity-tile">
            <History size={18} aria-hidden />
            <span className="profile-hub__activity-tile-label">{m(locale, "profile.navHistory")}</span>
            <span className="profile-hub__activity-tile-value">{user.bookings.length}</span>
          </Link>
          <Link href="/favorites" className="profile-hub__activity-tile">
            <Heart size={18} aria-hidden />
            <span className="profile-hub__activity-tile-label">{m(locale, "profile.navFavorites")}</span>
            <span className="profile-hub__activity-tile-value">{user.favorites.length}</span>
          </Link>
        </div>
        <HubGroupLabel>{m(locale, "profile.sectionPersonal")}</HubGroupLabel>
        <div className="profile-hub__nav-group">
          <HubNavBlock
            href="/profile/personal"
            icon={User}
            title={m(locale, "profile.personalInfo")}
            summary={`${phoneShort} · ${emailShort}`}
          />
        </div>

        <HubGroupLabel>{m(locale, "profile.security")}</HubGroupLabel>
        <div className="profile-hub__nav-group">
          <HubNavBlock
            href="/profile/security"
            icon={Shield}
            title={m(locale, "profile.security")}
            summary={m(locale, "profile.securitySubtitle")}
          />
        </div>

        <HubGroupLabel>{m(locale, "profile.sectionSettings")}</HubGroupLabel>
        <div className="profile-hub__nav-group">
          <HubNavBlock
            href="/profile/settings"
            icon={Globe}
            title={m(locale, "profile.settings")}
            summary={m(locale, "profile.sectionApp")}
          />
          <HubNavBlock
            href="/notifications"
            icon={Bell}
            title={m(locale, "profile.actionsNotifications")}
            summary={m(locale, "profile.settingsSubtitle")}
            badge={unreadNotifications}
          />
          <HubNavBlock
            href="/profile/subscriptions"
            icon={Megaphone}
            title={m(locale, "profile.subscriptions")}
            summary={m(locale, "profile.subscriptionsSubtitle")}
          />
        </div>

        <HubGroupLabel>{m(locale, "profile.sectionSupport")}</HubGroupLabel>
        <div className="profile-hub__nav-group">
        <HubNavBlock
          href="/faq"
          icon={CircleHelp}
          title={m(locale, "footer.helpCenter")}
          summary={m(locale, "profile.actionsHelp")}
        />
        <HubNavBlock
          href="/contacts"
          icon={MessageCircle}
          title={m(locale, "footer.contactUs")}
          summary={m(locale, "profile.actionsHelp")}
        />
        <HubNavBlock
          href="/policy"
          icon={FileText}
          title={m(locale, "footer.policy")}
          summary={m(locale, "profile.settingsPrivacy")}
        />
        <HubNavBlock
          href="/terms"
          icon={ScrollText}
          title={m(locale, "footer.terms")}
          summary={m(locale, "profile.consentManage")}
        />
        </div>

        {user.role === "GUEST" ? (
          <Link href="/profile/become-owner" className="profile-hub__promo">
            <span className="profile-hub__promo-title">{m(locale, "profile.hostBannerTitle")}</span>
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}

        {user.role === "OWNER" ? (
          <Link href="/dashboard/owner" className="profile-hub__promo">
            <span className="profile-hub__promo-title">{m(locale, "profile.navOwner")}</span>
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}

        {user.role === "ADMIN" ? (
          <Link href="/dashboard/admin" className="profile-hub__promo">
            <span className="profile-hub__promo-title">{m(locale, "profile.navAdmin")}</span>
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
