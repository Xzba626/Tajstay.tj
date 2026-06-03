import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { HomeHeroParticles } from "@/components/home/HomeHeroParticles";
import { HomeHeroStats } from "@/components/home/HomeHeroStats";

type Props = {
  locale: Locale;
};

export function HomeHeroPremium({ locale }: Props) {
  const stats = [
    {
      value: 2400,
      suffix: "+",
      label: m(locale, "home.heroStatListings")
    },
    {
      value: 50,
      suffix: "+",
      label: m(locale, "home.heroStatCities")
    },
    {
      value: 4.9,
      suffix: "★",
      label: m(locale, "home.heroStatRating"),
      decimals: 1
    }
  ];

  const chips = [
    { icon: "✓", text: m(locale, "home.trust1Title") },
    { icon: "🔒", text: m(locale, "home.trust2Title") },
    { icon: "💬", text: m(locale, "home.trust3Title") }
  ];

  return (
    <div className="home-hero-premium">
      <HomeHeroParticles />
      <div className="home-hero-premium__content">
        <HomeHeroStats stats={stats} />

        <div className="home-hero-premium__badge">{m(locale, "home.heroBadge")}</div>

        <h1 className="home-hero-premium__title">
          {m(locale, "home.heroTitleBefore")}
          <span className="home-hero-premium__title-accent">{m(locale, "home.heroTitleAccent")}</span>
          {m(locale, "home.heroTitleAfter")}
        </h1>

        <p className="home-hero-premium__subtitle">{m(locale, "home.heroSubtitle")}</p>

        <ul className="home-hero-premium__chips" aria-label={m(locale, "home.trustTitle")}>
          {chips.map((chip) => (
            <li key={chip.text} className="home-hero-premium__chip">
              <span aria-hidden>{chip.icon}</span>
              {chip.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
