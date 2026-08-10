import Link from "next/link";
import { Bell, ChevronRight, CreditCard, Lock, Settings, Shield } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { profileContactSubtitle } from "@/lib/profile/contactDisplay";
import { resolveUserNames } from "@/lib/profile/userName";
import LogoutButton from "@/components/LogoutButton";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { ProfileBecomeOwnerCard } from "@/components/profile/ProfileBecomeOwnerCard";
import { TajikPattern } from "@/components/ds/TajikPattern";

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
  ownerNav: OwnerAppNavState;
  logoutLabel: string;
};

function MenuRow({ href, icon: Icon, label }: { href: string; icon: typeof Lock; label: string }) {
  return (
    <Link href={href} className="mockup-menu__item profile-hub-menu-row">
      <Icon size={18} className="profile-hub-menu-row__icon shrink-0" aria-hidden />
      <span>{label}</span>
      <ChevronRight size={16} className="ml-auto text-[var(--color-text-muted)]" aria-hidden />
    </Link>
  );
}

export function ProfileHubView({ locale, user, ownerNav, logoutLabel }: Props) {
  const { fullName } = resolveUserNames(user);
  const subtitle = profileContactSubtitle(user);

  return (
    <div className="mockup-screen profile-hub-screen !px-0" data-heritage-motif="chakan">
      <div className="profile-hero-card relative overflow-hidden">
        <TajikPattern kind="chakan" className="pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="relative z-[1] flex flex-col items-center">
        <ProfileAvatar name={fullName} imageUrl={user.image ?? user.telegramPhotoUrl} size="lg" className="profile-avatar--gold-ring" />
        <div className="profile-hero-card__name">{fullName}</div>
        {subtitle ? <div className="profile-hero-card__sub">{subtitle}</div> : null}
        <Link href="/profile/edit" className="btn-primary profile-hero-card__cta">
          {m(locale, "profile.editProfile")}
        </Link>
        </div>
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
        <div className="mockup-stat-tile mockup-stat-tile--muted" aria-disabled>
          <div className="mockup-stat-tile__value">0</div>
          <div className="mockup-stat-tile__label">{m(locale, "profile.statCashback")}</div>
        </div>
      </div>

      <h2 className="profile-section-title">{m(locale, "profile.sectionAccount")}</h2>
      <nav className="mockup-menu" aria-label={m(locale, "profile.sectionAccount")}>
        <MenuRow href="/profile/account" icon={Lock} label={m(locale, "profile.sectionAccount")} />
        <MenuRow href="/profile/settings" icon={Settings} label={m(locale, "profile.settings")} />
        <MenuRow href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
        <MenuRow href="/notifications" icon={Bell} label={m(locale, "profile.actionsNotifications")} />
        <MenuRow href="/profile/payments" icon={CreditCard} label={m(locale, "profile.payments")} />
      </nav>

      {user.role === "GUEST" ? (
        <div className="mt-4">
          <ProfileBecomeOwnerCard locale={locale} role={user.role} ownerNav={ownerNav} />
        </div>
      ) : null}

      {user.role === "OWNER" ? (
        <Link href="/dashboard/owner" className="mockup-host-banner mockup-host-banner--owner mt-4">
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

      <div className="profile-hub-screen__logout">
        <LogoutButton label={logoutLabel} confirmMessage={m(locale, "userMenu.logoutConfirm")} variant="row" />
      </div>
    </div>
  );
}
