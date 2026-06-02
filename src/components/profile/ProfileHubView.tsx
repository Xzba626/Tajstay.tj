import Link from "next/link";
import { Bell, ChevronRight, CreditCard, LayoutDashboard, Lock, Settings, Shield, User } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { profileContactSubtitle } from "@/lib/profile/contactDisplay";
import { resolveUserNames } from "@/lib/profile/userName";
import LogoutButton from "@/components/LogoutButton";

type UserFull = {
  name: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  phone: string;
  email: string | null;
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

function MenuRow({ href, icon: Icon, label }: { href: string; icon: typeof User; label: string }) {
  return (
    <Link href={href} className="mockup-menu__item">
      <Icon size={18} className="shrink-0 text-[var(--text-secondary)]" aria-hidden />
      <span>{label}</span>
      <ChevronRight size={16} className="ml-auto text-[var(--text-muted)]" aria-hidden />
    </Link>
  );
}

export function ProfileHubView({ locale, user, logoutLabel }: Props) {
  const { fullName } = resolveUserNames(user);
  const subtitle = profileContactSubtitle(user);

  return (
    <div className="mockup-screen !px-0">
      <div className="profile-hero-card">
        <ProfileAvatar name={fullName} imageUrl={user.image ?? user.telegramPhotoUrl} size="lg" />
        <div className="profile-hero-card__name">{fullName}</div>
        {subtitle ? <div className="profile-hero-card__sub">{subtitle}</div> : null}
        <Link href="/profile/edit" className="btn-primary profile-hero-card__cta">
          {m(locale, "profile.editProfile")}
        </Link>
      </div>

      <div className="mockup-stat-row profile-stat-row--compact">
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

      <h2 className="profile-section-title">{m(locale, "profile.sectionProfile")}</h2>
      <nav className="mockup-menu" aria-label={m(locale, "profile.sectionProfile")}>
        <MenuRow href="/profile/edit" icon={User} label={m(locale, "profile.editProfile")} />
      </nav>

      <h2 className="profile-section-title">{m(locale, "profile.sectionAccount")}</h2>
      <nav className="mockup-menu" aria-label={m(locale, "profile.sectionAccount")}>
        <MenuRow href="/profile/account" icon={Lock} label={m(locale, "profile.sectionAccount")} />
        <MenuRow href="/profile/settings" icon={Settings} label={m(locale, "profile.settings")} />
        <MenuRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
        <MenuRow href="/notifications" icon={Bell} label={m(locale, "profile.actionsNotifications")} />
        <MenuRow href="/profile/payments" icon={CreditCard} label={m(locale, "profile.payments")} />
      </nav>

      {user.role === "GUEST" ? (
        <Link href="/profile/become-owner" className="mockup-host-banner mt-4">
          <div className="mockup-host-banner__title">{m(locale, "profile.hostBannerTitle")}</div>
          <div className="mockup-host-banner__desc">{m(locale, "profile.hostBannerDesc")}</div>
        </Link>
      ) : null}

      {user.role === "OWNER" ? (
        <Link href="/dashboard/owner" className="mockup-host-banner mt-4">
          <div className="mockup-host-banner__title">{m(locale, "profile.navOwner")}</div>
          <div className="mockup-host-banner__desc">{m(locale, "profile.navOwnerDesc")}</div>
        </Link>
      ) : null}

      {user.role === "ADMIN" ? (
        <Link href="/dashboard/admin" className="mockup-host-banner mockup-host-banner--admin mt-4">
          <div className="mockup-host-banner__title">{m(locale, "profile.navAdmin")}</div>
          <div className="mockup-host-banner__desc">{m(locale, "profile.navAdminDesc")}</div>
        </Link>
      ) : null}

      {(user.role === "OWNER" || user.role === "ADMIN") && (
        <>
          <h2 className="profile-section-title">{m(locale, "profile.sectionPanels")}</h2>
          <nav className="mockup-menu" aria-label={m(locale, "profile.sectionPanels")}>
            {user.role === "OWNER" ? (
              <MenuRow href="/dashboard/owner" icon={LayoutDashboard} label={m(locale, "profile.navOwner")} />
            ) : null}
            {user.role === "ADMIN" ? (
              <MenuRow href="/dashboard/admin" icon={Shield} label={m(locale, "profile.navAdmin")} />
            ) : null}
          </nav>
        </>
      )}

      <div className="mockup-menu mt-4">
        <div className="mockup-menu__item border-0 p-0">
          <LogoutButton label={logoutLabel} variant="row" />
        </div>
      </div>
    </div>
  );
}
