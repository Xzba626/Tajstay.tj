import Link from "next/link";
import {
  Bell,
  ChevronRight,
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
  badge
}: {
  href: string;
  icon: typeof User;
  label: string;
  meta?: string;
  badge?: number;
}) {
  return (
    <Link href={href} className="profile-center__row">
      <Icon size={18} className="profile-center__row-icon" aria-hidden />
      <span className="profile-center__row-body">
        <span className="profile-center__row-label">{label}</span>
        {meta ? <span className="profile-center__row-meta">{meta}</span> : null}
      </span>
      {badge && badge > 0 ? <span className="profile-center__row-badge">{badge > 99 ? "99+" : badge}</span> : null}
      <ChevronRight size={16} className="profile-center__row-chevron" aria-hidden />
    </Link>
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

      <div className="profile-center__stats" aria-label={m(locale, "profile.actionsTitle")}>
        <Link href="/history" className="profile-center__stat">
          <span className="profile-center__stat-value">{user.bookings.length}</span>
          <span className="profile-center__stat-label">{m(locale, "profile.statBookings")}</span>
        </Link>
        <Link href="/favorites" className="profile-center__stat">
          <span className="profile-center__stat-value">{user.favorites.length}</span>
          <span className="profile-center__stat-label">{m(locale, "profile.statFavorites")}</span>
        </Link>
        <div className="profile-center__stat" aria-hidden={false}>
          <span className="profile-center__stat-value">0</span>
          <span className="profile-center__stat-label">{m(locale, "profile.statCashback")}</span>
        </div>
      </div>

      <div className="profile-center__layout">
        <aside className="profile-center__aside">
          <div className="profile-center__header">
            <ProfileAvatar name={user.name} imageUrl={user.image ?? user.telegramPhotoUrl} size="xl" />
            <div className="profile-center__identity">
              <h2 className="profile-center__name">{user.name}</h2>
              <p className="profile-center__role">{m(locale, "profile.memberRole")}</p>
              <div className="profile-center__badges">
                {emailOk ? (
                  <span className="profile-center__badge">✓ {m(locale, "profile.emailVerifiedBadge")}</span>
                ) : (
                  <Link href="/profile/email" className="profile-center__badge profile-center__badge--warn">
                    ⚠ {m(locale, "profile.emailVerifyPrompt")}
                  </Link>
                )}
                {phoneOk ? (
                  <span className="profile-center__badge">✓ {m(locale, "profile.phoneVerified")}</span>
                ) : (
                  <Link href="/profile/phone" className="profile-center__badge profile-center__badge--warn">
                    ⚠ {m(locale, "profile.phoneVerifyPrompt")}
                  </Link>
                )}
              </div>
            </div>
            <Link href="/profile/personal" className="profile-center__edit" aria-label={m(locale, "profile.editProfile")}>
              <Pencil size={15} aria-hidden />
              <span className="profile-center__edit-label">{m(locale, "profile.editProfile")}</span>
            </Link>
          </div>
        </aside>

        <div className="profile-center__main">
          <section className="profile-center__section">
            <h3 className="profile-center__section-title">{m(locale, "profile.sectionMain")}</h3>
            <nav className="profile-center__menu" aria-label={m(locale, "profile.sectionMain")}>
              <MenuRow href="/history" icon={History} label={m(locale, "profile.navHistory")} />
              <MenuRow href="/favorites" icon={Heart} label={m(locale, "profile.navFavorites")} />
              <MenuRow
                href="/notifications"
                icon={Bell}
                label={m(locale, "profile.actionsNotifications")}
                badge={unreadNotifications}
              />
            </nav>
          </section>

          <section className="profile-center__section">
            <h3 className="profile-center__section-title">{m(locale, "profile.sectionPersonal")}</h3>
            <nav className="profile-center__menu" aria-label={m(locale, "profile.sectionPersonal")}>
              <MenuRow
                href="/profile/personal"
                icon={User}
                label={m(locale, "profile.personalInfo")}
                meta={m(locale, "profile.personalInfoHint")}
              />
              <MenuRow
                href="/profile/phone"
                icon={Phone}
                label={m(locale, "profile.phone")}
                meta={`${phoneShort}${phoneOk ? ` · ${m(locale, "profile.statusVerified")}` : ""}`}
              />
              <MenuRow
                href="/profile/email"
                icon={Mail}
                label={m(locale, "profile.email")}
                meta={`${emailShort}${emailOk ? ` · ${m(locale, "profile.statusVerified")}` : ""}`}
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
              />
            </nav>
          </section>

          <section className="profile-center__section">
            <h3 className="profile-center__section-title">{m(locale, "profile.sectionAccount")}</h3>
            <nav className="profile-center__menu" aria-label={m(locale, "profile.sectionAccount")}>
              <MenuRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
              <MenuRow href="/profile/subscriptions" icon={Megaphone} label={m(locale, "profile.subscriptions")} />
            </nav>
          </section>

          <section className="profile-center__section">
            <h3 className="profile-center__section-title">{m(locale, "profile.sectionApp")}</h3>
            <nav className="profile-center__menu" aria-label={m(locale, "profile.sectionApp")}>
              <MenuRow href="/profile/settings" icon={Settings} label={m(locale, "profile.settings")} />
            </nav>
          </section>

          {user.role === "GUEST" ? (
            <Link href="/profile/become-owner" className="profile-center__banner">
              <div className="profile-center__banner-title">{m(locale, "profile.hostBannerTitle")}</div>
              <div className="profile-center__banner-desc">{m(locale, "profile.hostBannerDesc")}</div>
            </Link>
          ) : null}

          {user.role === "OWNER" ? (
            <Link href="/dashboard/owner" className="profile-center__banner">
              <div className="profile-center__banner-title">{m(locale, "profile.navOwner")}</div>
              <div className="profile-center__banner-desc">{m(locale, "profile.navOwnerDesc")}</div>
            </Link>
          ) : null}

          {user.role === "ADMIN" ? (
            <Link href="/dashboard/admin" className="profile-center__banner">
              <div className="profile-center__banner-title">{m(locale, "profile.navAdmin")}</div>
              <div className="profile-center__banner-desc">{m(locale, "profile.navAdminDesc")}</div>
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
