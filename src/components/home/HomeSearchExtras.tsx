import Link from "next/link";
import { GuestHomeExtras } from "@/components/guest/GuestHomeExtras";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";
import { ContentGrid } from "@/components/ds";
import { m } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";
import type { HomeBanner } from "@/lib/site-content";

type Props = {
  locale: Locale;
  banner: HomeBanner;
};

export function HomeSearchExtras({ locale, banner }: Props) {
  const destinationCards = [
    { title: m(locale, "home.cityDushanbe"), text: m(locale, "home.dest1"), cityQuery: "Dushanbe" },
    { title: m(locale, "home.cityKhujand"), text: m(locale, "home.dest2"), cityQuery: "Khujand" },
    { title: m(locale, "home.cityPenjikent"), text: m(locale, "home.dest3"), cityQuery: "Penjikent" },
    { title: m(locale, "home.cityBadakhshan"), text: m(locale, "home.dest4"), cityQuery: "Badakhshan" }
  ];

  const trustPoints = [
    { title: m(locale, "home.trust1Title"), text: m(locale, "home.trust1Text"), icon: "✓" as const },
    { title: m(locale, "home.trust2Title"), text: m(locale, "home.trust2Text"), icon: "🔒" as const },
    { title: m(locale, "home.trust3Title"), text: m(locale, "home.trust3Text"), icon: "💬" as const }
  ];

  return (
    <div className="search-moved-sections__inner">
      <section className="search-moved-block">
        <HomeSectionHeader
          eyebrow={m(locale, "home.destinationsBadge")}
          title={m(locale, "home.destinationsGridTitle")}
          action={{ href: "/search", label: m(locale, "home.ctaSearch") }}
        />
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {destinationCards.map((d) => (
            <ViewTransitionLink key={d.title} href={`/search?city=${encodeURIComponent(d.cityQuery)}`} className="shrink-0">
              <div className="home-dest-chip">
                <span className="text-sm font-semibold text-[var(--taj-color-text)]">{d.title}</span>
                <span className="mt-1 line-clamp-2 text-[10px] leading-snug text-[var(--taj-color-text-muted)]">{d.text}</span>
              </div>
            </ViewTransitionLink>
          ))}
        </div>
      </section>

      <GuestHomeExtras locale={locale} compact />

      <section className="search-moved-block">
        <HomeSectionHeader title={m(locale, "home.trustTitle")} align="center" className="!text-center [&_.home-section__desc]:mx-auto" />
        <ContentGrid cols={3} gap="md">
          {trustPoints.map((item) => (
            <div key={item.title} className="home-trust-card">
              <div className="home-trust-card__icon">{item.icon}</div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--taj-color-text)]">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--taj-color-text-muted)]">{item.text}</p>
            </div>
          ))}
        </ContentGrid>
      </section>

      {banner.enabled ? (
        <section className="search-moved-block">
          <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-950/90 to-teal-900/80 p-5">
            <h2 className="text-lg font-bold text-white">{banner.title}</h2>
            <p className="mt-2 text-sm text-emerald-100/90">{banner.subtitle}</p>
            <Link href={banner.ctaHref} className="taj-btn taj-btn--primary mt-4 inline-flex">
              {banner.ctaText}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
