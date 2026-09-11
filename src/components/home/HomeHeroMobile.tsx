import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function HomeHeroMobile({ locale }: { locale: Locale }) {
  // Product decision: one line only. The subtitle ("Проверенные объекты • Безопасное
  // бронирование") pushed Search further down the first mobile viewport for no functional gain
  // — this is a search app, not a marketing landing page.
  return (
    <header className="home-hero-mobile md:hidden">
      <h1 className="home-hero-mobile__title">{m(locale, "home.heroTitle")}</h1>
    </header>
  );
}
