import "./globals.css";
import "@fontsource/inter/latin.css";
import "@fontsource/inter/cyrillic.css";
import "@fontsource/playfair-display/latin.css";
import "@fontsource/playfair-display/cyrillic.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: BRAND.title,
    description: "Национальная платформа бронирования жилья в Таджикистане",
    icons: {
      icon: [
        { url: BRAND.favicon, sizes: "32x32", type: "image/png" },
        { url: BRAND.favicon, sizes: "512x512", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
      ],
      apple: [{ url: BRAND.favicon, sizes: "180x180", type: "image/png" }]
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a281c"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  assertProdSecrets();
  const locale = getLocale();
  const user = await getSessionUser();
  const unreadCount = user ? await getUnreadNotificationsCount(user.id) : 0;
  return (
    <html lang={locale} className="scroll-smooth" data-theme="dark">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href={BRAND.favicon} sizes="180x180" />
        <link rel="icon" href={BRAND.favicon} type="image/png" sizes="32x32" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={BRAND.name} />
      </head>
      <body className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)] antialiased font-sans">
        <AuthProvider>
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
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
