import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { HotelCard } from "@/components/HotelCard";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default async function FavoritesPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-100">{m(locale, "userMenu.favorites")}</h1>
        <p className="text-slate-300">{m(locale, "profile.signInPrompt")}</p>
        <a className="ds-primary-btn inline-flex items-center" href="/auth/sign-in">
          {m(locale, "profile.signInCta")}
        </a>
      </div>
    );
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { hotel: { include: { rooms: true } } }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-100">{m(locale, "userMenu.favorites")}</h1>
        <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-300">
          {favorites.length} сохранено
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((f) => (
          <HotelCard key={f.id} hotel={f.hotel} locale={locale} variant="list" />
        ))}
        {!favorites.length && (
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
            <p className="text-slate-300">Пока нет избранных отелей.</p>
            <a
              href="/search"
              className="mt-4 inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              Найти отели
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

