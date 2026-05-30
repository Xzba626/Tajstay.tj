import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function HomeHeroMobile({ locale }: { locale: Locale }) {
  return (
    <header className="home-hero-mobile md:hidden">
      <h1 className="home-hero-mobile__title">{m(locale, "home.mobileTitle")}</h1>
      <p className="home-hero-mobile__subtitle">{m(locale, "home.mobileSubtitle")}</p>
    </header>
  );
}
