import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { BRAND } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { searchApprovedHotels } from "@/lib/services/search";
import { HotelCard } from "@/components/HotelCard";
import { getSiteContent } from "@/lib/site-content";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";
import { HomeScrollEnhancer } from "./HomeScrollEnhancer";
import { GuestHomeExtras } from "@/components/guest/GuestHomeExtras";
import { SearchBar } from "@/components/SearchBar";
import { PageContainer, SectionContainer, ContentGrid, EmptyStateCard } from "@/components/ds";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { HomeReviewsSection } from "@/components/home/HomeReviewsSection";
import { headers } from "next/headers";
import { getCityFromRequestHeaders, sortHotelsByNearbyCity } from "@/lib/geo/ipCity";
import { HomeHeroMedia } from "@/components/home/HomeHeroMedia";
import { resolveHeroVideoSources } from "@/lib/heritage/heroVideo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  return buildPageMetadata({
    title: BRAND.title,
    description: m(locale, "meta.siteDescription"),
    path: "/"
  });
}

export default async function HomePage() {
  const locale = getLocale();
  const hdrs = headers();
  const nearbyCity = await getCityFromRequestHeaders(hdrs);
  const featuredRaw = await searchApprovedHotels({});
  const featured = sortHotelsByNearbyCity(featuredRaw, nearbyCity);
  const content = await getSiteContent();

  const destinationCards = [
    {
      title: m(locale, "home.cityDushanbe"),
      text: m(locale, "home.dest1"),
      cityQuery: "Dushanbe",
      tone: "lake" as const
    },
    {
      title: m(locale, "home.cityKhujand"),
      text: m(locale, "home.dest2"),
      cityQuery: "Khujand",
      tone: "mist" as const
    },
    {
      title: m(locale, "home.cityPenjikent"),
      text: m(locale, "home.dest3"),
      cityQuery: "Penjikent",
      tone: "lake" as const
    },
    {
      title: m(locale, "home.cityBadakhshan"),
      text: m(locale, "home.dest4"),
      cityQuery: "Badakhshan",
      tone: "saffron" as const
    }
  ];

  const trustPoints = [
    { title: m(locale, "home.trust1Title"), text: m(locale, "home.trust1Text") },
    { title: m(locale, "home.trust2Title"), text: m(locale, "home.trust2Text") },
    { title: m(locale, "home.trust3Title"), text: m(locale, "home.trust3Text") }
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

  const heroImage = featured.find((h) => h.coverImageUrl)?.coverImageUrl ?? null;
  const heroVideo = resolveHeroVideoSources();

  return (
    <div className="home-page home-page--pamir pb-12 md:pb-20" data-heritage-motif="pamir">
      <HomeScrollEnhancer />

      {/* First viewport: brand · headline · search · cinematic media */}
      <section className="home-hero-pamir home-hero-pamir--heritage" aria-label={BRAND.name}>
        <div className="home-hero-pamir__media" aria-hidden>
          <HomeHeroMedia sources={heroVideo} coverImageUrl={heroImage} />
          {!heroVideo.enabled && !heroImage ? (
            <>
              <div className="home-hero-pamir__fallback" />
              <div className="home-hero-pamir__veil" />
            </>
          ) : null}
        </div>

        <PageContainer publicPage className="home-hero-pamir__content relative z-[1] !py-0">
          <p className="home-hero-pamir__brand">{BRAND.name}</p>
          <h1 className="home-hero-pamir__title">{t(locale, "heroTitle")}</h1>
          <p className="home-hero-pamir__subtitle">{t(locale, "heroSubtitle")}</p>
          <div id="home-search" className="home-hero-pamir__search scroll-mt-24">
            <SearchBar locale={locale} />
          </div>
        </PageContainer>
      </section>

      {content.homeBanner.enabled ? (
        <section className="home-section home-section--compact" data-reveal>
          <PageContainer publicPage className="!py-0">
            <div className="home-promo-strip">
              <div>
                <h2 className="home-promo-strip__title">{content.homeBanner.title}</h2>
                <p className="home-promo-strip__text">{content.homeBanner.subtitle}</p>
              </div>
              <Link href={content.homeBanner.ctaHref} className="taj-btn taj-btn--primary shrink-0">
                {content.homeBanner.ctaText}
              </Link>
            </div>
          </PageContainer>
        </section>
      ) : null}

      <section className="home-section home-section--compact" data-reveal>
        <PageContainer publicPage className="!py-0">
          <HomeSectionHeader
            title={m(locale, "home.featuredTitle")}
            action={{ href: "/search", label: m(locale, "home.featuredAll") }}
            motif="divider"
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

      <section id="popular-destinations" className="home-section home-section--compact scroll-mt-24" data-reveal>
        <PageContainer publicPage className="!py-0">
          <HomeSectionHeader
            eyebrow={m(locale, "home.destinationsBadge")}
            title={m(locale, "home.destinationsGridTitle")}
            action={{ href: "/search", label: m(locale, "home.ctaSearch") }}
            motif="pamir"
          />
          <div className="home-dest-rail">
            {destinationCards.map((d) => (
              <ViewTransitionLink
                key={d.title}
                href={`/search?city=${encodeURIComponent(d.cityQuery)}`}
                className="home-dest-tile"
                data-tone={d.tone}
              >
                <span className="home-dest-tile__title">{d.title}</span>
                <span className="home-dest-tile__text">{d.text}</span>
              </ViewTransitionLink>
            ))}
          </div>
        </PageContainer>
      </section>

      <GuestHomeExtras locale={locale} />

      <section className="home-section home-section--compact" data-reveal>
        <PageContainer publicPage className="!py-0">
          <HomeReviewsSection locale={locale} reviews={latestReviews} />
        </PageContainer>
      </section>

      <SectionContainer tight className="home-section home-section--compact" data-reveal>
        <PageContainer publicPage className="!py-0">
          <HomeSectionHeader
            title={m(locale, "home.trustTitle")}
            align="center"
            motif="crown"
            className="!text-center [&_.home-section__desc]:mx-auto"
          />
          <ContentGrid cols={3} gap="md">
            {trustPoints.map((item) => (
              <div key={item.title} className="home-trust-panel">
                <h3 className="home-trust-panel__title">{item.title}</h3>
                <p className="home-trust-panel__text">{item.text}</p>
              </div>
            ))}
          </ContentGrid>
        </PageContainer>
      </SectionContainer>
    </div>
  );
}
