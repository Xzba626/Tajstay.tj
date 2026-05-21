import Link from "next/link";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { ProfileBecomeOwnerCard } from "@/components/profile/ProfileBecomeOwnerCard";
import { TrustBadges } from "@/components/auth/TrustBadges";
import { getUserTrustBadges } from "@/lib/auth/trustBadges";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-100">{m(locale, "profile.title")}</h1>
        <p className="text-slate-300">{m(locale, "profile.signInPrompt")}</p>
        <a className="ds-primary-btn inline-flex items-center" href="/auth/sign-in">
          {m(locale, "profile.signInCta")}
        </a>
      </div>
    );
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      hotels: true,
      bookings: true,
      favorites: { include: { hotel: true } },
      ownerApplications: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  const ownerNav = await getOwnerApplicationNavState(user);
  const trustBadges = full ? getUserTrustBadges(full) : [];

  const reviews = await prisma.review.findMany({
    where: { booking: { userId: user.id } },
    include: { booking: { include: { room: { include: { hotel: true } } } } },
    orderBy: { id: "desc" },
    take: 20
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold text-slate-100">{m(locale, "profile.title")}</h1>

      <div className="liquid-glass rounded-2xl border border-white/10 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-slate-100">{full?.name}</div>
            <div className="mt-1 text-sm text-slate-300">{full?.email ?? "—"}</div>
            <TrustBadges locale={locale} badges={trustBadges} size="md" className="mt-3" />
          </div>
          <div className="shrink-0 rounded-xl bg-brand-900/80 px-3 py-2 text-right text-xs text-slate-300 ring-1 ring-white/10">
            <div>
              {m(locale, "profile.phone")}:{" "}
              <span className="font-medium text-slate-100">
                {full?.phone && !isPlaceholderAccountPhone(full.phone) ? full.phone : m(locale, "profile.phoneNotSet")}
              </span>
            </div>
            <div className="mt-1">
              <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 font-semibold text-slate-200">
                {full?.role === "OWNER" ? m(locale, "profile.roleOwner") : full?.role === "ADMIN" ? m(locale, "profile.roleAdmin") : m(locale, "profile.roleGuest")}
              </span>
            </div>
          </div>
        </div>
        {full?.role === "GUEST" && (
          <p className="mt-3 text-sm text-slate-300">
            {m(locale, "profile.statsGuest", { favorites: full.favorites.length, bookings: full.bookings.length })}
          </p>
        )}
        {full?.role === "OWNER" && <p className="mt-3 text-sm text-slate-300">{m(locale, "profile.statsOwner", { count: full.hotels.length })}</p>}
      </div>

      <ProfileBecomeOwnerCard locale={locale} role={full?.role ?? "GUEST"} ownerNav={ownerNav} />

      <nav className="quiet-card flex flex-col gap-2 rounded-2xl p-4 text-sm shadow-sm">
        <Link href="/dashboard/guest" className="text-emerald-300 hover:underline">
          {m(locale, "profile.navBookings")}
        </Link>
        <Link href="/dashboard/messages" className="text-emerald-300 hover:underline">
          {m(locale, "profile.navMessages")}
        </Link>
        <Link href="/favorites" className="text-emerald-300 hover:underline">
          {m(locale, "profile.navFavorites")}
        </Link>
        {full?.role === "OWNER" && (
          <Link href="/dashboard/owner" className="text-emerald-300 hover:underline">
            {m(locale, "profile.navOwner")}
          </Link>
        )}
        {full?.role === "ADMIN" && (
          <Link href="/dashboard/admin" className="text-emerald-300 hover:underline">
            {m(locale, "profile.navAdmin")}
          </Link>
        )}
      </nav>

      <section id="reviews" className="scroll-mt-24">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">{m(locale, "profile.reviewsTitle")}</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">{m(locale, "profile.reviewsEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="quiet-card rounded-xl p-4 text-sm">
                <div className="font-medium text-slate-100">{r.booking.room.hotel.name}</div>
                <div className="text-slate-300">{r.rating} ★ · {r.comment}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LogoutButton />
    </div>
  );
}
