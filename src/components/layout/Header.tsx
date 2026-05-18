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

export async function Header() {
  const user = await getSessionUser();
  const ownerApp = await getOwnerApplicationNavState(user);
  const locale = getLocale();
  const content = await getSiteContent();
  const unreadCount = user ? await getUnreadNotificationsCount(user.id) : 0;

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
    applyAgain: m(locale, "userMenu.applyAgain")
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-white/12 bg-slate-950/55 shadow-[0_8px_32px_rgba(2,6,23,0.45)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/[0.06] transition-[box-shadow,background-color] duration-300 supports-[backdrop-filter]:bg-slate-950/40 hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)]">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-2 px-3 sm:h-[84px] sm:gap-3 sm:px-6 lg:px-8">
        <ViewTransitionLink
          href="/"
          className="flex min-w-0 max-w-[74vw] shrink items-center gap-2 rounded-xl outline-none ring-emerald-300/0 transition hover:opacity-90 focus-visible:ring-2 sm:max-w-none sm:gap-3"
          data-magnetic
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Image
              src={content.brand.logoMarkUrl}
              alt={content.brand.siteName}
              width={64}
              height={64}
              className="h-10 w-10 shrink-0 rounded-xl bg-white/5 p-1.5 shadow-lg shadow-emerald-900/30 ring-1 ring-white/10 sm:h-12 sm:w-12 sm:rounded-2xl"
              priority
              unoptimized
            />
            <div className="min-w-0 leading-tight">
              <div className="brand-wordmark truncate text-sm font-extrabold tracking-tight sm:text-xl">{content.brand.siteName}</div>
            </div>
          </div>
        </ViewTransitionLink>

        <nav className="order-3 hidden w-full items-center justify-center gap-6 border-t border-white/10 py-2 text-sm font-medium text-[var(--brand-muted)] md:order-none md:flex md:w-auto md:border-0 md:py-0 lg:gap-8">
          <ViewTransitionLink href="/" className="rounded-lg px-1 transition-colors duration-200 hover:text-[var(--brand-green)]">
            {m(locale, "header.home")}
          </ViewTransitionLink>
          <ViewTransitionLink href="/search" className="rounded-lg px-1 transition-colors duration-200 hover:text-[var(--brand-green)]">
            {m(locale, "header.search")}
          </ViewTransitionLink>
          <ViewTransitionLink href="/about" className="rounded-lg px-1 transition-colors duration-200 hover:text-[var(--brand-green)]">
            {m(locale, "header.about")}
          </ViewTransitionLink>
        </nav>

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
          <MobileMenu user={user} ownerApp={ownerApp} locale={locale} labels={mobileLabels} />
          {!user ? (
            <>
              <ViewTransitionLink
                href="/auth/sign-in"
                className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 md:inline-flex"
              >
                {m(locale, "header.signIn")}
              </ViewTransitionLink>
              <ViewTransitionLink
                href="/auth/sign-in"
                className="hidden ds-primary-btn md:inline-flex md:px-4"
              >
                {m(locale, "header.signUp")}
              </ViewTransitionLink>
            </>
          ) : (
            <div className="hidden md:block">
              <UserMenu userName={user.name} role={user.role} ownerApp={ownerApp} labels={menuLabels} initialUnreadCount={unreadCount} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
