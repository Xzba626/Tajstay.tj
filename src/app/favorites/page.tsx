import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { HotelCard } from "@/components/HotelCard";
import { FavoritesTabs } from "@/components/favorites/FavoritesTabs";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default async function FavoritesPage({
  searchParams
}: {
  searchParams?: { tab?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <div className="mockup-screen">
        <h1 className="mockup-screen__title">{m(locale, "userMenu.favorites")}</h1>
        <p className="mockup-screen__subtitle">{m(locale, "profile.signInPrompt")}</p>
        <a className="btn-primary mt-4 inline-flex !w-auto px-6" href="/auth/sign-in">
          {m(locale, "profile.signInCta")}
        </a>
      </div>
    );
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { hotel: { include: { rooms: true } } }
  });

  const destinations = [
    { title: m(locale, "home.cityDushanbe"), city: "Dushanbe" },
    { title: m(locale, "home.cityKhujand"), city: "Khujand" },
    { title: m(locale, "home.cityPenjikent"), city: "Penjikent" },
    { title: m(locale, "home.cityBadakhshan"), city: "Badakhshan" }
  ];

  return (
    <div className="mockup-screen max-w-2xl">
      <h1 className="mockup-screen__title">{m(locale, "favoritesPage.title")}</h1>

      <Suspense fallback={null}>
        <FavoritesTabs
          labels={{
            housing: m(locale, "favoritesPage.tabHousing"),
            destinations: m(locale, "favoritesPage.tabDestinations")
          }}
          destinations={
            <div className="space-y-2">
              {destinations.map((d) => (
                <Link
                  key={d.city}
                  href={`/search?city=${encodeURIComponent(d.city)}`}
                  className="mockup-menu__item rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
                >
                  {d.title}
                  <span className="mockup-menu__value">→</span>
                </Link>
              ))}
            </div>
          }
        >
          <div className="space-y-3">
            {favorites.map((f) => (
              <HotelCard key={f.id} hotel={f.hotel} locale={locale} variant="list" />
            ))}
            {!favorites.length ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">{m(locale, "favoritesPage.empty")}</p>
                <Link href="/search" className="btn-primary mt-4 inline-flex !w-auto !px-6 !h-11 text-sm">
                  {m(locale, "home.ctaSearch")}
                </Link>
              </div>
            ) : null}
          </div>
        </FavoritesTabs>
      </Suspense>
    </div>
  );
}
