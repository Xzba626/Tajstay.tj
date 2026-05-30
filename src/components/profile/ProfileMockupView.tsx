import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Mail,
  Phone,
  Send,
  Settings,
  Shield,
  User
} from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { maskPhone } from "@/lib/format/maskPhone";
import { maskEmail, formatTelegram } from "@/lib/format/maskEmail";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import LogoutButton from "@/components/LogoutButton";

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
};

function MenuRow({
  href,
  icon: Icon,
  label,
  value
}: {
  href: string;
  icon: typeof User;
  label: string;
  value?: string;
}) {
  return (
    <Link href={href} className="mockup-menu__item">
      <Icon size={18} className="shrink-0 text-[var(--text-secondary)]" aria-hidden />
      <span>{label}</span>
      {value ? <span className="mockup-menu__value truncate max-w-[40%]">{value}</span> : null}
      <ChevronRight size={16} className="ml-auto text-[var(--text-muted)]" aria-hidden />
    </Link>
  );
}

export function ProfileMockupView({ locale, user, logoutLabel }: Props) {
  const hasPhone = Boolean(user.phone && !isPlaceholderAccountPhone(user.phone));
  const phoneShort = hasPhone ? maskPhone(user.phone) : m(locale, "profile.phoneNotSet");
  const emailShort = maskEmail(user.email) ?? m(locale, "profile.emailNotSet");
  const tgShort = formatTelegram(user.telegramUsername, user.telegramId) ?? m(locale, "profile.telegramNotConnected");

  return (
    <div className="mockup-screen !px-0">
      <h1 className="mockup-screen__title">{m(locale, "profile.title")}</h1>

      <div className="mockup-profile-hero">
        <ProfileAvatar name={user.name} imageUrl={user.image ?? user.telegramPhotoUrl} size="lg" />
        <div className="mockup-profile-hero__meta">
          <div className="mockup-profile-hero__name">{user.name}</div>
          <Link href="/profile/personal" className="mockup-profile-hero__link">
            {m(locale, "profile.viewProfile")}
          </Link>
        </div>
      </div>

      <div className="mockup-stat-row">
        <Link href="/dashboard/bookings" className="mockup-stat-tile">
          <div className="mockup-stat-tile__value">{user.bookings.length}</div>
          <div className="mockup-stat-tile__label">{m(locale, "profile.statBookings")}</div>
        </Link>
        <Link href="/favorites" className="mockup-stat-tile">
          <div className="mockup-stat-tile__value">{user.favorites.length}</div>
          <div className="mockup-stat-tile__label">{m(locale, "profile.statFavorites")}</div>
        </Link>
        <div className="mockup-stat-tile">
          <div className="mockup-stat-tile__value">0</div>
          <div className="mockup-stat-tile__label">{m(locale, "profile.statCashback")}</div>
        </div>
      </div>

      <nav className="mockup-menu" aria-label={m(locale, "profile.actionsTitle")}>
        <MenuRow href="/profile/personal" icon={User} label={m(locale, "profile.personalInfo")} />
        <MenuRow href="/profile/phone" icon={Phone} label={m(locale, "profile.phone")} value={phoneShort} />
        <MenuRow href="/profile/email" icon={Mail} label={m(locale, "profile.email")} value={emailShort} />
        <MenuRow href="/profile/telegram" icon={Send} label={m(locale, "profile.telegram")} value={tgShort} />
        <MenuRow href="/profile/settings" icon={Settings} label={m(locale, "profile.settings")} />
        <MenuRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
        <MenuRow href="/notifications" icon={Bell} label={m(locale, "profile.actionsNotifications")} />
        <MenuRow href="/profile/payments" icon={CreditCard} label={m(locale, "profile.payments")} />
      </nav>

      {user.role === "GUEST" ? (
        <Link href="/profile/become-owner" className="mockup-host-banner">
          <div className="mockup-host-banner__title">{m(locale, "profile.hostBannerTitle")}</div>
          <div className="mockup-host-banner__desc">{m(locale, "profile.hostBannerDesc")}</div>
        </Link>
      ) : null}

      {user.role === "OWNER" ? (
        <Link href="/dashboard/owner" className="mockup-host-banner">
          <div className="mockup-host-banner__title">{m(locale, "profile.navOwner")}</div>
          <div className="mockup-host-banner__desc">{m(locale, "profile.navOwnerDesc")}</div>
        </Link>
      ) : null}

      <div className="mockup-menu mt-4">
        <div className="mockup-menu__item border-0 p-0">
          <LogoutButton label={logoutLabel} variant="row" />
        </div>
      </div>
    </div>
  );
}
