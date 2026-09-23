import "./globals.css";
import "@fontsource/dm-sans/latin.css";
import "@fontsource/dm-sans/latin-ext.css";
import "@fontsource/playfair-display/latin.css";
import "@fontsource/playfair-display/cyrillic.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FooterVisibility } from "@/components/layout/FooterVisibility";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AppShell } from "@/components/navigation/AppShell";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { PageBackdrop } from "@/components/effects/PageBackdrop";
import { GlobalToast } from "@/components/layout/GlobalToast";
import { PwaClientShell } from "@/components/pwa/PwaClientShell";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";
import { getSessionUser } from "@/lib/auth/session";
import { m } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/get-locale";
import { BRAND } from "@/lib/brand";
import { getSiteContent } from "@/lib/site-content";
import { AuthProvider } from "@/providers/auth-provider";
import { assertProdSecrets } from "@/lib/security/envGuard";
import { resolveMetadataBase } from "@/lib/site-url";
import { getPendingTripsCount } from "@/lib/trips/pendingCount";
import { ShellBoundaryGuard } from "@/components/layout/ShellBoundaryGuard";
import { cookies } from "next/headers";
import { THEME_COOKIE, normalizeTheme, themeAttrFor } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    metadataBase: resolveMetadataBase(),
    title: BRAND.title,
    description: "Национальная платформа бронирования жилья в Таджикистане",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon.png", sizes: "32x32", type: "image/png" },
        { url: BRAND.favicon, sizes: "512x512", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      title: BRAND.title,
      description: "Национальная платформа бронирования жилья в Таджикистане",
      images: [{ url: BRAND.ogImage, width: 1200, height: 630, alt: content.brand.siteName }]
    },
    twitter: {
      card: "summary_large_image",
      images: [BRAND.ogImage]
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: content.brand.siteName
    }
  };
}

/**
 * App-like mobile scaling. `maximumScale`/`userScalable` are a product decision: on a phone the
 * shells are laid out for the device width, and an accidental pinch turned Home into a zoomed,
 * pannable canvas. The layout is correct without this (the responsive defects were fixed
 * separately) — this is not a cover for overflow bugs.
 *
 * Accessibility trade-off, stated plainly: this asks the browser not to allow pinch-zoom, which
 * works against WCAG 1.4.4. It is a request, not a guarantee — iOS Safari 10+ deliberately ignores
 * it, and Android honours it only while "Force enable zoom" is off. Desktop is unaffected: the
 * viewport meta applies to mobile viewports only. No JS gesture blocking and no touch
 * preventDefault is used, so keyboard navigation and browser-level zoom stay intact.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0F7A4D"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  assertProdSecrets();
  const locale = getLocale();
  const user = await getSessionUser();
  const unreadCount = user ? await getUnreadNotificationsCount(user.id) : 0;
  const pendingTripsCount =
    user?.role === "GUEST" ? await getPendingTripsCount(user.id) : 0;
  const shellHeader = (await headers()).get("x-tajstay-shell");
  // Admin/Owner CRM shells render their own chrome (see dashboard/admin, dashboard/owner
  // layouts) — the Public/Consumer shell below (Header/Footer/MobileBottomNav/AppShell/
  // Cookie/PWA prompts) must not leak into those two. Classified in middleware.ts, not CSS.
  const resolvedShell =
    shellHeader === "admin" || shellHeader === "owner" || shellHeader === "manager" ? shellHeader : "consumer";
  const isConsumerShell = resolvedShell === "consumer";
  // MOBILE PROFILE / OWNER / SECURITY CORRECTION BLOCK: theme preference is read from a cookie
  // server-side (same pattern as the locale cookie) so the correct `data-theme` attribute is
  // already present in the very first HTML sent to the browser — no client-side toggle-after-
  // mount, no light->dark flash. "system" omits the attribute entirely and lets the
  // `@media (prefers-color-scheme: dark)` CSS fallback (tajstay-design-system.css) decide, which
  // is the only way "System" can track the OS without a hydration mismatch.
  const themePref = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value);
  const themeAttr = themeAttrFor(themePref);
  return (
    <html
      lang={locale}
      className="scroll-smooth"
      {...(themeAttr ? { "data-theme": themeAttr } : {})}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={BRAND.name} />
      </head>
      {/* BLOCK HOME/PWA 7.0: `min-h-screen` (100vh, a fixed value) is taller on a real mobile
       * browser than the space actually visible while the URL bar is showing, then the browser
       * chrome collapses/expands as the user scrolls — producing exactly the "page can be
       * meaninglessly dragged up/down" feel reported, even when a devtools/emulated viewport
       * (which never shows browser chrome) measures zero scroll range. `min-h-dvh` tracks the
       * real, currently-visible viewport instead. */}
      <body className="min-h-dvh bg-white text-[var(--text-primary-semantic,#14231b)] antialiased font-sans" suppressHydrationWarning>
        <AuthProvider>
          <ShellBoundaryGuard serverShell={resolvedShell} />
          {isConsumerShell ? (
            <>
              <AppShell locale={locale} />
              <SplashScreen />
              <PageBackdrop />
              <GlobalToast />
              <PwaClientShell
                isAuthed={Boolean(user)}
                initialUnreadCount={unreadCount}
                toastLabel={m(locale, "notifications.bell.newToast")}
                installLabels={{
                  title: m(locale, "pwa.installTitle"),
                  body: m(locale, "pwa.installBody"),
                  install: m(locale, "pwa.installAction"),
                  dismiss: m(locale, "pwa.installDismiss")
                }}
                pushLabels={{
                  title: m(locale, "pwa.pushTitle"),
                  enable: m(locale, "pwa.pushEnable"),
                  later: m(locale, "pwa.pushLater"),
                  unsupported: m(locale, "pwa.pushUnsupported")
                }}
              />
              {/* ts-consumer-shell: opts the whole consumer app into the same theme-aware
                  design tokens already proven on Profile/Admin/Owner (tajstay-design-system.css
                  plus the "MOBILE UI FOUNDATION" block in globals.css) - previously
                  Search/Hotel/Booking/Chat/History/Tours had no dark-mode tokens at all.
                  Header stays brand green regardless (its own hardcoded styling, untouched);
                  only surfaces/text/borders that read these tokens flip. */}
              <div className="ts-consumer-shell flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <FooterVisibility>
                  <Footer />
                </FooterVisibility>
              </div>
              <MobileBottomNav
                pendingBookingsCount={pendingTripsCount}
                labels={{
                  ariaLabel: m(locale, "bottomNav.ariaLabel"),
                  home: m(locale, "bottomNav.home"),
                  search: m(locale, "bottomNav.search"),
                  tours: m(locale, "bottomNav.tours"),
                  history: m(locale, "bottomNav.history"),
                  profile: m(locale, "bottomNav.profile")
                }}
              />
              <CookieConsent
                text={m(locale, "cookies.text")}
                acceptLabel={m(locale, "cookies.accept")}
                rejectLabel={m(locale, "cookies.reject")}
                moreLabel={m(locale, "cookies.more")}
                moreHref="/policy"
              />
            </>
          ) : (
            children
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
