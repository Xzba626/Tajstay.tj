import { t } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
  trustPoints: string[];
};

export function HomeHeroMobile({ locale, trustPoints }: Props) {
  return (
    <header className="home-hero-mobile md:hidden">
      <div className="home-hero-mobile__badge home-hero-badge">{m(locale, "home.heroBadge")}</div>
      <h1 className="home-hero-mobile__title home-hero-title">{t(locale, "heroTitle")}</h1>
      <p className="home-hero-mobile__trust home-hero-trust-compact" aria-label="Trust highlights">
        {trustPoints.join(" · ")}
      </p>
    </header>
  );
}
