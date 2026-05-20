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
import { getSiteContent } from "@/lib/site-content";
import { AuthProvider } from "@/providers/auth-provider";
import { assertProdSecrets } from "@/lib/security/envGuard";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `${content.brand.siteName} — Tajikistan stays`,
    description: "Национальная платформа бронирования жилья в Таджикистане",
    icons: { icon: content.brand.faviconUrl || "/logo-mark.svg" },
    manifest: "/manifest.webmanifest",
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
  themeColor: "#059669"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  assertProdSecrets();
  const locale = getLocale();
  const user = await getSessionUser();
  const unreadCount = user ? await getUnreadNotificationsCount(user.id) : 0;
  return (
    <html lang={locale} className="scroll-smooth" data-theme="light">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-[var(--brand-bg)] text-slate-100 antialiased font-sans">
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
