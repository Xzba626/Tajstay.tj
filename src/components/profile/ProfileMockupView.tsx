import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Globe,
  Heart,
  History,
  Mail,
  Megaphone,
  Pencil,
  Phone,
  Send,
  Settings,
  Shield,
  User
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

function MenuRow({
  href,
  icon: Icon,
  label,
  meta,
  badge,
  className
}: {
  href: string;
  icon: typeof User;
  label: string;
  meta?: string;
  badge?: number;
  className?: string;
}) {
  return (
    <Link href={href} className={`profile-center__row${className ? ` ${className}` : ""}`}>
      <Icon size={17} className="profile-center__row-icon" aria-hidden />
      <span className="profile-center__row-body">
        <span className="profile-center__row-label">{label}</span>
        {meta ? <span className="profile-center__row-meta">{meta}</span> : null}
      </span>
      {badge && badge > 0 ? <span className="profile-center__row-badge">{badge > 99 ? "99+" : badge}</span> : null}
      <ChevronRight size={15} className="profile-center__row-chevron" aria-hidden />
    </Link>
  );
}

function MenuGroup({
  title,
  ariaLabel,
  className,
  children
}: {
  title: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`profile-center__group${className ? ` ${className}` : ""}`}>
      <h3 className="profile-center__group-title">{title}</h3>
      <nav className="profile-center__menu" aria-label={ariaLabel}>
        {children}
      </nav>
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

  return (
    <div className="profile-center">
      <h1 className="profile-center__title">{m(locale, "profile.title")}</h1>

      <div className="profile-center__layout">
        <aside className="profile-center__aside">
          <header className="profile-center__identity-card">
            <div className="profile-center__identity-row">
              <ProfileAvatar
                name={user.name}
                imageUrl={user.image ?? user.telegramPhotoUrl}
                size="md"
                className="profile-center__avatar"
              />
              <div className="profile-center__identity-main">
                <h2 className="profile-center__name">{user.name}</h2>
                {user.role !== "GUEST" ? (
                  <p className="profile-center__role">
                    {user.role === "OWNER"
                      ? m(locale, "profile.roleOwner")
                      : user.role === "ADMIN"
                        ? m(locale, "profile.roleAdmin")
                        : null}
                  </p>
                ) : null}
                <div className="profile-center__badges">
                  {emailOk ? (
                    <span className="profile-center__badge profile-center__badge--ok">
                      {m(locale, "profile.emailVerifiedBadge")}
                    </span>
                  ) : (
                    <Link href="/profile/email" className="profile-center__badge profile-center__badge--warn">
                      {m(locale, "profile.emailVerifyPrompt")}
                    </Link>
                  )}
                  {phoneOk ? (
                    <span className="profile-center__badge profile-center__badge--ok">
                      {m(locale, "profile.phoneVerified")}
                    </span>
                  ) : (
                    <Link href="/profile/phone" className="profile-center__badge profile-center__badge--warn">
                      {m(locale, "profile.phoneVerifyPrompt")}
                    </Link>
                  )}
                </div>
              </div>
              <Link
                href="/profile/personal"
                className="profile-center__edit-btn"
                aria-label={m(locale, "profile.editProfile")}
              >
                <Pencil size={16} aria-hidden />
              </Link>
            </div>
          </header>

          <div className="profile-center__summary" aria-label={m(locale, "profile.actionsTitle")}>
            <Link href="/history" className="profile-center__summary-item">
              <span className="profile-center__summary-value">{user.bookings.length}</span>
              <span className="profile-center__summary-label">{m(locale, "profile.statBookings")}</span>
            </Link>
            <span className="profile-center__summary-divider" aria-hidden />
            <Link href="/favorites" className="profile-center__summary-item">
              <span className="profile-center__summary-value">{user.favorites.length}</span>
              <span className="profile-center__summary-label">{m(locale, "profile.statFavorites")}</span>
            </Link>
          </div>
        </aside>

        <div className="profile-center__main">
          <MenuGroup title={m(locale, "profile.sectionMain")} ariaLabel={m(locale, "profile.sectionMain")}>
            <MenuRow href="/history" icon={History} label={m(locale, "profile.navHistory")} />
            <MenuRow href="/favorites" icon={Heart} label={m(locale, "profile.navFavorites")} />
            <MenuRow
              href="/notifications"
              icon={Bell}
              label={m(locale, "profile.actionsNotifications")}
              badge={unreadNotifications}
            />
          </MenuGroup>

          <MenuGroup title={m(locale, "profile.sectionSettings")} ariaLabel={m(locale, "profile.sectionSettings")}>
            <MenuRow href="/profile/settings" icon={Globe} label={m(locale, "profile.language")} />
            <MenuRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
            <MenuRow href="/profile/settings" icon={Settings} label={m(locale, "profile.settings")} />
            <MenuRow
              href="/profile/personal"
              icon={User}
              label={m(locale, "profile.personalInfo")}
              className="profile-center__row--mobile-only"
            />
            <MenuRow href="/profile/subscriptions" icon={Megaphone} label={m(locale, "profile.subscriptions")} />
          </MenuGroup>

          <MenuGroup
            title={m(locale, "profile.sectionPersonal")}
            ariaLabel={m(locale, "profile.sectionPersonal")}
            className="profile-center__group--contacts"
          >
            <MenuRow
              href="/profile/personal"
              icon={User}
              label={m(locale, "profile.personalInfo")}
              className="profile-center__row--desktop-only"
            />
            <MenuRow
              href="/profile/phone"
              icon={Phone}
              label={m(locale, "profile.phone")}
              meta={`${phoneShort}${phoneOk ? ` · ${m(locale, "profile.statusVerified")}` : ""}`}
              className="profile-center__row--desktop-only"
            />
            <MenuRow
              href="/profile/email"
              icon={Mail}
              label={m(locale, "profile.email")}
              meta={`${emailShort}${emailOk ? ` · ${m(locale, "profile.statusVerified")}` : ""}`}
              className="profile-center__row--desktop-only"
            />
            <MenuRow
              href="/profile/telegram"
              icon={Send}
              label={m(locale, "profile.telegram")}
              meta={
                tgConnected
                  ? `${tgShort} · ${m(locale, "profile.telegramConnected")}`
                  : m(locale, "profile.telegramNotConnected")
              }
              className="profile-center__row--desktop-only"
            />
          </MenuGroup>

          {user.role === "GUEST" ? (
            <Link href="/profile/become-owner" className="profile-center__promo">
              <span className="profile-center__promo-title">{m(locale, "profile.hostBannerTitle")}</span>
              <span className="profile-center__promo-desc">{m(locale, "profile.hostBannerDesc")}</span>
              <ChevronRight size={16} className="profile-center__promo-chevron" aria-hidden />
            </Link>
          ) : null}

          {user.role === "OWNER" ? (
            <Link href="/dashboard/owner" className="profile-center__promo">
              <span className="profile-center__promo-title">{m(locale, "profile.navOwner")}</span>
              <span className="profile-center__promo-desc">{m(locale, "profile.navOwnerDesc")}</span>
              <ChevronRight size={16} className="profile-center__promo-chevron" aria-hidden />
            </Link>
          ) : null}

          {user.role === "ADMIN" ? (
            <Link href="/dashboard/admin" className="profile-center__promo">
              <span className="profile-center__promo-title">{m(locale, "profile.navAdmin")}</span>
              <span className="profile-center__promo-desc">{m(locale, "profile.navAdminDesc")}</span>
              <ChevronRight size={16} className="profile-center__promo-chevron" aria-hidden />
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
    </div>
  );
}
