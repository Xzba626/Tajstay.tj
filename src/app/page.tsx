import Link from "next/link";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { searchApprovedHotels } from "@/lib/services/search";
import { HotelCard } from "@/components/HotelCard";
import { getSiteContent } from "@/lib/site-content";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db/safeDb";
import { HeroThreeBackground } from "@/components/effects/HeroThreeBackground";
import { Hero3DSceneGate } from "@/components/effects/Hero3DSceneGate";
import { AIRecommendationLab } from "@/components/ai/AIRecommendationLab";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";
import { HomeScrollEnhancer } from "./HomeScrollEnhancer";
import { SearchBar } from "@/components/SearchBar";
import { getBookingGuestLabel } from "@/lib/domain/booking";
import { HomeHeroLuxury } from "@/components/home/HomeHeroLuxury";

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

  const trustPoints = [
    { title: m(locale, "home.trust1Title"), text: m(locale, "home.trust1Text"), icon: "✓" as const },
    { title: m(locale, "home.trust2Title"), text: m(locale, "home.trust2Text"), icon: "🔒" as const },
    { title: m(locale, "home.trust3Title"), text: m(locale, "home.trust3Text"), icon: "💬" as const }
  ];

  const latestReviews = await safeDbQuery(
    "home.latestReviews",
    () =>
      prisma.review.findMany({
        include: { booking: { include: { user: true, room: { include: { hotel: true } } } } },
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
    <div className="home-chapters">
      <HomeScrollEnhancer />

      <section className="home-chapter home-chapter--band-hero home-chapter--snap noise-overlay relative flex min-h-[min(78svh,760px)] flex-col overflow-hidden pb-4 pt-4 sm:min-h-[min(100dvh,960px)] sm:pb-10 sm:pt-10">
        <HeroThreeBackground />
        <Hero3DSceneGate className="pointer-events-none absolute inset-0 -z-10" />
        <HomeHeroLuxury
          heroBadge={m(locale, "home.heroBadge")}
          heroTitle={t(locale, "heroTitle")}
          heroSubtitle={t(locale, "heroSubtitle")}
          ctaSearch={m(locale, "home.ctaSearch")}
          ctaOwners={m(locale, "home.ctaOwners")}
        >
          <SearchBar locale={locale} />
        </HomeHeroLuxury>
      </section>

      <div className="home-chapter-divider" aria-hidden />

      {content.homeBanner.enabled && (
        <>
          <section className="home-chapter home-chapter--snap py-6 sm:py-8" data-reveal>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-[1.75rem] border border-emerald-300/20 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 p-6 text-white shadow-xl shadow-emerald-900/30">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{content.homeBanner.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-emerald-100/90">{content.homeBanner.subtitle}</p>
                  </div>
                  <Link
                    href={content.homeBanner.ctaHref}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
                  >
                    {content.homeBanner.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <div className="home-chapter-divider" aria-hidden />
        </>
      )}

      <section className="home-chapter home-chapter--snap home-chapter--band-a relative overflow-hidden border-y border-slate-800/70 py-8 sm:py-14" data-reveal>
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
            {m(locale, "home.trustTitle")}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4">
            {trustPoints.map((item) => (
              <div key={item.title} className="glass-panel rounded-2xl p-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-lg text-emerald-100 ring-1 ring-white/10">
                  {item.icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="home-chapter-divider" aria-hidden />

      <section className="home-chapter home-chapter--snap home-chapter--band-b relative overflow-hidden py-8 sm:py-14" data-reveal>
        <div className="relative z-[1] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">{m(locale, "home.featuredTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base" />
            </div>
            <Link
              href="/search"
              className="shrink-0 text-sm font-semibold text-emerald-300 underline-offset-4 transition hover:underline"
            >
              {m(locale, "home.featuredAll")}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
            ))}
            {!featured.length && (
              <div className="glass-panel lg:col-span-3 rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-slate-300">
                {m(locale, "admin.emptyResults")}
                <p className="mt-2 text-sm text-slate-400">{m(locale, "admin.emptyResultsHint")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="home-chapter-divider" aria-hidden />

      <div className="home-chapter home-chapter--snap home-chapter--band-a relative overflow-hidden py-8 sm:py-14">
        <div className="relative z-[1]">
          <AIRecommendationLab
          hotels={aiHotels}
          locale={locale}
          labels={{
            badge: m(locale, "aiLab.badge"),
            title: "AI Подборка",
            subtitle: m(locale, "aiLab.subtitle"),
            surprise: m(locale, "aiLab.surprise"),
            budget: m(locale, "aiLab.budget"),
            tripStyle: m(locale, "aiLab.tripStyle"),
            modeFocus: m(locale, "aiLab.modeFocus"),
            modeNature: m(locale, "aiLab.modeNature"),
            modeRomance: m(locale, "aiLab.modeRomance"),
            modeAdventure: m(locale, "aiLab.modeAdventure"),
            match: m(locale, "aiLab.match"),
            open: m(locale, "aiLab.open")
          }}
        />
        </div>
      </div>

      <div className="home-chapter-divider" aria-hidden />

      <section id="popular-destinations" className="home-chapter home-chapter--snap home-chapter--destinations relative overflow-hidden scroll-mt-24 py-8 sm:py-14" data-reveal>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent" aria-hidden />
        <div className="relative z-[1] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="surface-1 rounded-[2rem] p-5 ring-1 ring-emerald-400/15 sm:p-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
                  {m(locale, "home.destinationsBadge")}
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
                  {m(locale, "home.destinationsGridTitle")}
                </h2>
              </div>
              <ViewTransitionLink href="/search" className="btn-ghost text-sm">
                {m(locale, "home.ctaSearch")}
              </ViewTransitionLink>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {destinationCards.map((d) => (
                <ViewTransitionLink
                  key={d.title}
                  href={`/search?city=${encodeURIComponent(d.cityQuery)}`}
                  className="shrink-0"
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center text-xs font-semibold text-slate-100">
                    {d.title}
                  </div>
                </ViewTransitionLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="home-chapter-divider" aria-hidden />

      <section
        className="home-chapter home-chapter--snap relative flex min-h-[68vh] flex-col justify-center overflow-hidden py-10 sm:min-h-[min(85vh,800px)] sm:py-20"
        data-reveal
      >
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{m(locale, "home.reviewsTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-300" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {latestReviews.map((r) => (
              <blockquote
                key={r.id}
                className="glass-panel rounded-2xl p-6 transition hover:shadow-2xl hover:shadow-emerald-900/30"
              >
                <div className="flex gap-0.5 text-amber-400" aria-label={m(locale, "home.reviewsStarsAria", { n: r.rating })}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <span key={i} aria-hidden>
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-200">&ldquo;{r.comment}&rdquo;</p>
                <footer className="mt-4 border-t border-slate-700/70 pt-4 text-sm">
                  <span className="font-semibold text-slate-100">{getBookingGuestLabel(r.booking)}</span>
                  <span className="text-slate-400"> · {r.booking.room.hotel.city}</span>
                </footer>
              </blockquote>
            ))}
            {!latestReviews.length && (
              <div className="glass-panel lg:col-span-3 rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-slate-300">
                {m(locale, "home.reviewsEmpty")}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="home-chapter-divider" aria-hidden />

      <section className="home-chapter home-chapter--snap flex min-h-[min(70vh,720px)] flex-col justify-center pb-20 pt-8 sm:pb-24 sm:pt-12" data-reveal>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-800 p-8 text-white shadow-2xl shadow-emerald-900/25 sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{m(locale, "home.ctaOwners")}</h2>
                <p className="mt-3 max-w-xl text-green-100/90">{m(locale, "home.ownersShort")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/apply/owner"
                  className="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300 active:scale-[0.99]"
                >
                  {m(locale, "userMenu.becomeOwner")}
                </Link>
                <Link
                  href="/dashboard/owner"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 active:scale-[0.99]"
                >
                  {m(locale, "userMenu.ownerPanel")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
