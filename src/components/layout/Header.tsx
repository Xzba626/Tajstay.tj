import { BrandMark } from "@/components/brand/BrandMark";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { UserMenu, type UserMenuLabels } from "@/components/layout/UserMenu";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { SiteHeaderFrame } from "@/components/layout/SiteHeaderFrame";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { getUserTrustBadges } from "@/lib/auth/trustBadges";

export async function Header() {
  const user = await getSessionUser();
  const ownerApp = await getOwnerApplicationNavState(user);
  const locale = getLocale();
  const content = await getSiteContent();
  const unreadCount = user ? await getUnreadNotificationsCount(user.id) : 0;
  const trustBadges = user ? getUserTrustBadges(user) : [];

  const menuLabels: UserMenuLabels = {
    account: m(locale, "userMenu.account"),
    profile: m(locale, "userMenu.profile"),
    bookings: m(locale, "userMenu.bookings"),
    favorites: m(locale, "userMenu.favorites"),
    becomeOwner: m(locale, "userMenu.becomeOwner"),
    ownerPending: m(locale, "userMenu.ownerPending"),
    ownerApproved: m(locale, "userMenu.ownerApproved"),
    ownerRejected: m(locale, "userMenu.ownerRejected"),
    applyAgain: m(locale, "userMenu.applyAgain"),
    ownerPanel: m(locale, "userMenu.ownerPanel"),
    adminPanel: m(locale, "userMenu.adminPanel"),
    logout: m(locale, "userMenu.logout"),
    loggingOut: m(locale, "userMenu.loggingOut"),
    unreadNotifications: m(locale, "userMenu.unreadNotifications"),
    notificationsTitle: m(locale, "userMenu.notificationsTitle"),
    noNotifications: m(locale, "userMenu.noNotifications"),
    markReadAll: m(locale, "userMenu.markReadAll"),
    openAllNotifications: m(locale, "userMenu.openAllNotifications")
  };

  const bellLabels = {
    ariaLabel: m(locale, "header.notificationsBell"),
    title: m(locale, "userMenu.notificationsTitle"),
    noNotifications: m(locale, "userMenu.noNotifications"),
    noNotificationsHint: m(locale, "notifications.bell.emptyHint"),
    markReadAll: m(locale, "userMenu.markReadAll"),
    openAll: m(locale, "userMenu.openAllNotifications"),
    soundOn: m(locale, "notifications.bell.soundOn"),
    soundOff: m(locale, "notifications.bell.soundOff"),
    justNow: m(locale, "notifications.bell.justNow"),
    minutesAgo: m(locale, "notifications.bell.minutesAgo"),
    hoursAgo: m(locale, "notifications.bell.hoursAgo"),
    daysAgo: m(locale, "notifications.bell.daysAgo"),
    newToast: m(locale, "notifications.bell.newToast")
  };

  return (
    <SiteHeaderFrame>
      <div className="site-header__inner mx-auto flex max-w-[var(--taj-page-max)] items-center justify-between gap-2 px-[var(--taj-page-px)] sm:gap-3">
        <BrandMark
          href="/"
          name={content.brand.siteName}
          markSrc={content.brand.logoMarkUrl}
          size="sm"
          className="max-w-[74vw] shrink sm:max-w-none"
          nameClassName="text-base sm:text-xl"
        />

        <HeaderNav
          items={[
            { href: "/", label: m(locale, "header.home") },
            { href: "/search", label: m(locale, "header.search") },
            { href: "/about", label: m(locale, "header.about") }
          ]}
        />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LocaleSwitcher current={locale} iconOnly className="locale-switcher--icon-only" />
          {user ? (
            <div className="md:hidden">
              <NotificationBell initialUnreadCount={unreadCount} labels={bellLabels} />
            </div>
          ) : null}
          {!user ? (
            <Link href="/auth/sign-in" className="header-auth-signin-mobile mobile-login-button md:hidden">
              {m(locale, "header.signIn")}
            </Link>
          ) : null}
          {!user ? (
            <>
              <Link href="/auth/sign-in" className="header-auth-signin">
                {m(locale, "header.signIn")}
              </Link>
              <Link href="/auth/sign-in?mode=register" className="header-auth-signup">
                {m(locale, "header.signUp")}
              </Link>
            </>
          ) : (
            <>
              <div className="hidden md:block">
                <NotificationBell initialUnreadCount={unreadCount} labels={bellLabels} />
              </div>
              <div className="hidden md:block">
                <UserMenu
                  userName={user.name}
                  role={user.role}
                  ownerApp={ownerApp}
                  labels={menuLabels}
                  initialUnreadCount={unreadCount}
                  locale={locale}
                  trustBadges={trustBadges}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </SiteHeaderFrame>
  );
}
