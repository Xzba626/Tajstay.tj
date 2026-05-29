import Link from "next/link";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { searchApprovedHotels } from "@/lib/services/search";
import { HotelCard } from "@/components/HotelCard";
import { getSiteContent } from "@/lib/site-content";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { AIRecommendationLab } from "@/components/ai/AIRecommendationLab";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";
import { HomeScrollEnhancer } from "./HomeScrollEnhancer";
import { GuestHomeExtras } from "@/components/guest/GuestHomeExtras";
import { HomeSearchCompact } from "@/components/home/HomeSearchCompact";
import { TajstayHero3D } from "@/components/landing/TajstayHero3D";
import { PageContainer, SectionContainer, ContentGrid, EmptyStateCard } from "@/components/ds";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { HomeReviewsSection } from "@/components/home/HomeReviewsSection";

export default async function HomePage() {
  const locale = getLocale();
  const featured = await searchApprovedHotels({});
  const content = await getSiteContent();

  const destinationCards = [
    { title: m(locale, "home.cityDushanbe"), text: m(locale, "home.dest1"), cityQuery: "Dushanbe" },
    { title: m(locale, "home.cityKhujand"), text: m(locale, "home.dest2"), cityQuery: "Khujand" },
    { title: m(locale, "home.cityPenjikent"), text: m(locale, "home.dest3"), cityQuery: "Penjikent" },
    { title: m(locale, "home.cityBadakhshan"), text: m(locale, "home.dest4"), cityQuery: "Badakhshan" }
  ];

  const heroTrustPoints = [
    m(locale, "home.trust1Title"),
    m(locale, "home.trust2Title"),
    m(locale, "home.trust3Title")
  ];

  const trustPoints = [
    { title: m(locale, "home.trust1Title"), text: m(locale, "home.trust1Text"), icon: "✓" as const },
    { title: m(locale, "home.trust2Title"), text: m(locale, "home.trust2Text"), icon: "🔒" as const },
    { title: m(locale, "home.trust3Title"), text: m(locale, "home.trust3Text"), icon: "💬" as const }
  ];

  const latestReviews = await safeDbQuery(
    "home.latestReviews",
    () =>
      prisma.review.findMany({
        include: {
          booking: {
            include: {
              user: true,
              room: { include: { hotel: true } },
              roomType: { include: { hotel: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
    []
  );

  const aiHotels = featured.map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    rating: hotel.rating,
    minPrice: hotel.rooms.length ? Math.min(...hotel.rooms.map((room) => Number(room.price))) : 0
  }));

  return (
    <div className="home-page home-chapters pb-10 md:pb-16">
      <HomeScrollEnhancer />

      {/* 1. Hero + search (first screen) */}
      <section className="home-section home-section--hero home-chapter home-chapter--band-hero relative overflow-hidden">
        <div className="home-hero-bg home-hero-bg-fallback absolute inset-0" aria-hidden />
        <PageContainer publicPage className="relative z-[1] flex min-h-[inherit] flex-col justify-center !py-0">
          <TajstayHero3D
            heroBadge={m(locale, "home.heroBadge")}
            heroTitle={t(locale, "heroTitle")}
            heroSubtitle={t(locale, "heroSubtitle")}
            ctaSearch={m(locale, "home.ctaSearch")}
            trustPoints={heroTrustPoints}
          />
          <div id="home-search" className="home-hero-search-overlap scroll-mt-24" data-reveal>
            <HomeSearchCompact locale={locale} />
          </div>
        </PageContainer>
      </section>

      {content.homeBanner.enabled ? (
        <section className="home-section home-section--compact" data-reveal>
          <PageContainer publicPage className="!py-0">
            <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-950/90 to-teal-900/80 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white sm:text-xl">{content.homeBanner.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-emerald-100/90">{content.homeBanner.subtitle}</p>
                </div>
                <Link href={content.homeBanner.ctaHref} className="taj-btn taj-btn--primary shrink-0">
                  {content.homeBanner.ctaText}
                </Link>
              </div>
            </div>
          </PageContainer>
        </section>
      ) : null}

      {/* 2. Popular hotels */}
      <section className="home-section home-section--compact home-chapter" data-reveal>
        <PageContainer publicPage className="!py-0">
          <HomeSectionHeader
            title={m(locale, "home.featuredTitle")}
            action={{ href: "/search", label: m(locale, "home.featuredAll") }}
          />
          <div className="home-hotels-scroll">
            {featured.slice(0, 6).map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
            ))}
          </div>
          {!featured.length ? (
            <EmptyStateCard
              className="mt-4"
              title={m(locale, "admin.emptyResults")}
              description={m(locale, "admin.emptyResultsHint")}
              actions={
                <Link href="/search" className="taj-btn taj-btn--primary">
                  {m(locale, "home.ctaSearch")}
                </Link>
              }
            />
          ) : null}
        </PageContainer>
      </section>

      {/* Popular destinations — discovery aid below listings */}
      <section id="popular-destinations" className="home-section home-section--compact home-chapter scroll-mt-24" data-reveal>
        <PageContainer publicPage className="!py-0">
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
        </PageContainer>
      </section>

      <GuestHomeExtras locale={locale} />

      {/* 3. Reviews — social proof */}
      <section className="home-section home-section--compact home-chapter" data-reveal>
        <PageContainer publicPage className="!py-0">
          <HomeReviewsSection locale={locale} reviews={latestReviews} />
        </PageContainer>
      </section>

      {/* 4. AI generator */}
      <section className="home-section home-section--compact home-chapter" data-reveal>
        <PageContainer publicPage className="!py-0">
          <AIRecommendationLab
            hotels={aiHotels}
            locale={locale}
            labels={{
              badge: m(locale, "aiLab.badge"),
              title: m(locale, "aiLab.title"),
              subtitle: m(locale, "aiLab.subtitle"),
              surprise: m(locale, "aiLab.surprise"),
              budget: m(locale, "aiLab.budget"),
              tripStyle: m(locale, "aiLab.tripStyle"),
              modeFocus: m(locale, "aiLab.modeFocus"),
              modeNature: m(locale, "aiLab.modeNature"),
              modeRomance: m(locale, "aiLab.modeRomance"),
              modeAdventure: m(locale, "aiLab.modeAdventure"),
              match: m(locale, "aiLab.match"),
              pickedForYou: m(locale, "aiLab.pickedForYou"),
              tagInBudget: m(locale, "aiLab.tagInBudget"),
              tagNatureStyle: m(locale, "aiLab.tagNatureStyle"),
              tagHighRated: m(locale, "aiLab.tagHighRated"),
              open: m(locale, "aiLab.open")
            }}
          />
        </PageContainer>
      </section>

      {/* 5. Info block — Why TajStay (kept last per UX flow) */}
      <SectionContainer tight className="home-section home-section--compact home-chapter" data-reveal>
        <PageContainer publicPage className="!py-0">
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
        </PageContainer>
      </SectionContainer>
    </div>
  );
}
