"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe,
  Heart,
  History,
  Mail,
  Megaphone,
  MessageCircle,
  Pencil,
  Phone,
  ScrollText,
  Send,
  Settings,
  Shield,
  User,
  type LucideIcon
} from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileLogoutConfirm } from "@/components/profile/ProfileLogoutConfirm";
import { maskPhone } from "@/lib/format/maskPhone";
import { maskEmail, formatTelegram } from "@/lib/format/maskEmail";
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

function HubRow({
  href,
  icon: Icon,
  label,
  meta,
  badge
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  meta?: string;
  badge?: number;
}) {
  return (
    <Link href={href} className="profile-hub__row">
      <Icon size={17} className="profile-hub__row-icon" aria-hidden />
      <span className="profile-hub__row-body">
        <span className="profile-hub__row-label">{label}</span>
        {meta ? <span className="profile-hub__row-meta">{meta}</span> : null}
      </span>
      {badge && badge > 0 ? <span className="profile-hub__row-badge">{badge > 99 ? "99+" : badge}</span> : null}
      <ChevronRight size={15} className="profile-hub__row-chevron" aria-hidden />
    </Link>
  );
}

function HubSection({
  id,
  title,
  summary,
  icon: Icon,
  defaultOpen = false,
  children
}: {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`profile-hub__section${open ? " is-open" : ""}`} id={id}>
      <button
        type="button"
        className="profile-hub__section-toggle"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={18} className="profile-hub__section-icon" aria-hidden />
        <span className="profile-hub__section-copy">
          <span className="profile-hub__section-title">{title}</span>
          <span className="profile-hub__section-summary">{summary}</span>
        </span>
        <ChevronDown size={16} className="profile-hub__section-chevron" aria-hidden />
      </button>
      <div id={`${id}-panel`} className="profile-hub__section-panel" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

export function ProfileMockupView({ locale, user, logoutLabel, unreadNotifications = 0 }: Props) {
  const hasPhone = Boolean(user.phone && !isPlaceholderAccountPhone(user.phone));
  const phoneShort = hasPhone ? maskPhone(user.phone) : m(locale, "profile.phoneNotSet");
  const emailShort = maskEmail(user.email) ?? m(locale, "profile.emailNotSet");
  const tgConnected = Boolean(user.telegramId || user.telegramUsername);
  const tgShort =
    formatTelegram(user.telegramUsername, user.telegramId) ?? m(locale, "profile.telegramNotConnected");
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
        <HubSection
          id="profile-activity"
          title={m(locale, "profile.sectionMain")}
          summary={`${user.bookings.length} · ${user.favorites.length}`}
          icon={History}
          defaultOpen
        >
          <HubRow href="/history" icon={History} label={m(locale, "profile.navHistory")} meta={m(locale, "profile.statBookings")} />
          <HubRow href="/favorites" icon={Heart} label={m(locale, "profile.navFavorites")} meta={m(locale, "profile.statFavorites")} />
          <HubRow
            href="/notifications"
            icon={Bell}
            label={m(locale, "profile.actionsNotifications")}
            badge={unreadNotifications}
          />
        </HubSection>

        <HubSection
          id="profile-personal"
          title={m(locale, "profile.sectionPersonal")}
          summary={emailShort}
          icon={User}
        >
          <HubRow href="/profile/personal" icon={User} label={m(locale, "profile.personalInfo")} />
          <HubRow
            href="/profile/phone"
            icon={Phone}
            label={m(locale, "profile.phone")}
            meta={`${phoneShort}${phoneOk ? ` · ${m(locale, "profile.statusVerified")}` : ""}`}
          />
          <HubRow
            href="/profile/email"
            icon={Mail}
            label={m(locale, "profile.email")}
            meta={`${emailShort}${emailOk ? ` · ${m(locale, "profile.statusVerified")}` : ""}`}
          />
          <HubRow
            href="/profile/telegram"
            icon={Send}
            label={m(locale, "profile.telegram")}
            meta={tgConnected ? tgShort : m(locale, "profile.telegramNotConnected")}
          />
        </HubSection>

        <HubSection id="profile-settings" title={m(locale, "profile.sectionSettings")} summary={m(locale, "profile.settingsSubtitle")} icon={Settings}>
          <HubRow href="/profile/settings" icon={Globe} label={m(locale, "profile.language")} />
          <HubRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
          <HubRow href="/profile/settings" icon={Settings} label={m(locale, "profile.settings")} />
          <HubRow href="/profile/subscriptions" icon={Megaphone} label={m(locale, "profile.subscriptions")} />
        </HubSection>

        <HubSection id="profile-help" title={m(locale, "profile.sectionSupport")} summary={m(locale, "footer.helpCenter")} icon={CircleHelp}>
          <HubRow href="/faq" icon={CircleHelp} label={m(locale, "footer.helpCenter")} />
          <HubRow href="/contacts" icon={MessageCircle} label={m(locale, "footer.contactUs")} />
          <HubRow href="/policy" icon={FileText} label={m(locale, "footer.policy")} />
          <HubRow href="/terms" icon={ScrollText} label={m(locale, "footer.terms")} />
        </HubSection>

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
