import Image from "next/image";
import Link from "next/link";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";
import { getSessionUser } from "@/lib/auth/session";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { UserMenu, type UserMenuLabels } from "@/components/layout/UserMenu";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { MobileMenu, type MobileMenuLabels } from "@/components/layout/MobileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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

  const mobileLabels: MobileMenuLabels = {
    menu: m(locale, "mobileMenu.menu"),
    close: m(locale, "mobileMenu.close"),
    home: m(locale, "header.home"),
    search: m(locale, "header.search"),
    language: m(locale, "mobileMenu.language"),
    navSection: m(locale, "mobileMenu.nav"),
    accountSection: m(locale, "mobileMenu.account"),
    systemSection: m(locale, "mobileMenu.system"),
    about: m(locale, "footer.about"),
    contacts: m(locale, "footer.contacts"),
    policy: m(locale, "footer.policy"),
    terms: m(locale, "footer.terms"),
    faq: m(locale, "footer.faq"),
    signIn: m(locale, "header.signIn"),
    signUp: m(locale, "header.signUp"),
    profile: m(locale, "userMenu.profile"),
    bookings: m(locale, "userMenu.bookings"),
    favorites: m(locale, "userMenu.favorites"),
    becomeOwner: m(locale, "userMenu.becomeOwner"),
    ownerPanel: m(locale, "userMenu.ownerPanel"),
    adminPanel: m(locale, "userMenu.adminPanel"),
    logout: m(locale, "userMenu.logout"),
    loggingOut: m(locale, "userMenu.loggingOut"),
    ownerPending: m(locale, "userMenu.ownerPending"),
    ownerRejected: m(locale, "userMenu.ownerRejected"),
    applyAgain: m(locale, "userMenu.applyAgain"),
    notifications: m(locale, "userMenu.notificationsTitle")
  };

  return (
    <header className="site-header sticky top-0 z-[100] transition-[background-color] duration-300">
      <div className="site-header__inner mx-auto flex max-w-[var(--taj-page-max)] items-center justify-between gap-2 px-[var(--taj-page-px)] sm:gap-3">
        <ViewTransitionLink
          href="/"
          className="flex min-w-0 max-w-[74vw] shrink items-center gap-2 rounded-xl outline-none ring-emerald-300/0 transition hover:opacity-90 focus-visible:ring-2 sm:max-w-none sm:gap-3"
          data-magnetic
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Image
              src={content.brand.logoMarkUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              priority
              unoptimized
            />
            <div className="min-w-0 leading-tight">
              <div className="brand-wordmark truncate text-lg font-bold text-white sm:text-xl">{content.brand.siteName}</div>
            </div>
          </div>
        </ViewTransitionLink>

        <HeaderNav
          items={[
            { href: "/", label: m(locale, "header.home") },
            { href: "/search", label: m(locale, "header.search") },
            { href: "/about", label: m(locale, "header.about") }
          ]}
        />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="md:hidden">
            <LocaleSwitcher current={locale} className="[&_button]:min-h-[44px] [&_button]:rounded-xl [&_button]:border-white/10 [&_button]:bg-white/5 [&_button]:px-2.5 [&_button]:text-white [&_button]:shadow-none [&_button:hover]:bg-white/10" />
          </div>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <div className="hidden md:block">
            <LocaleSwitcher current={locale} />
          </div>
          {user ? (
            <div className="md:hidden">
              <NotificationBell
                initialUnreadCount={unreadCount}
                labels={{
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
                }}
              />
            </div>
          ) : null}
          <MobileMenu user={user} ownerApp={ownerApp} locale={locale} labels={mobileLabels} unreadCount={unreadCount} />
          {!user ? (
            <>
              <ViewTransitionLink href="/auth/sign-in" className="header-auth-signin">
                {m(locale, "header.signIn")}
              </ViewTransitionLink>
              <ViewTransitionLink href="/auth/sign-in" className="header-auth-signup">
                {m(locale, "header.signUp")}
              </ViewTransitionLink>
            </>
          ) : (
            <>
              <div className="hidden md:block">
                <NotificationBell
                  initialUnreadCount={unreadCount}
                  labels={{
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
                  }}
                />
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
    </header>
  );
}
