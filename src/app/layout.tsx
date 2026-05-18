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
import { getLocale } from "@/lib/i18n/get-locale";
import { getSiteContent } from "@/lib/site-content";
import { AuthProvider } from "@/providers/auth-provider";
import { assertProdSecrets } from "@/lib/security/envGuard";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `${content.brand.siteName} — Tajikistan stays`,
    description: "Национальная платформа бронирования жилья в Таджикистане",
    icons: { icon: content.brand.faviconUrl || "/logo-mark.svg" }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  assertProdSecrets();
  const locale = getLocale();
  return (
    <html lang={locale} className="scroll-smooth" data-theme="light">
      <body className="min-h-screen bg-[var(--brand-bg)] text-slate-100 antialiased font-sans">
        <AuthProvider>
          <SplashScreen />
          <PageBackdrop />
          <GlobalToast />
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
