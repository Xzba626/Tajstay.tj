import { t } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
};

export function HomeHeroMobile({ locale }: Props) {
  const subtitle = t(locale, "heroSubtitle");
  return (
    <header className="home-hero-mobile md:hidden">
      {m(locale, "home.heroBadge").trim() ? (
        <div className="home-hero-mobile__badge home-hero-badge">{m(locale, "home.heroBadge")}</div>
      ) : null}
      <h1 className="home-hero-mobile__title home-hero-title">{t(locale, "heroTitle")}</h1>
      {subtitle.trim() ? (
        <p className="home-hero-mobile__trust home-hero-trust-compact">{subtitle}</p>
      ) : null}
    </header>
  );
}
