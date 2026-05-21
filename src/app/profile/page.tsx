import Link from "next/link";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";

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

  const reviews = await prisma.review.findMany({
    where: { booking: { userId: user.id } },
    include: { booking: { include: { room: { include: { hotel: true } } } } },
    orderBy: { id: "desc" },
    take: 20
  });

  const latestApp = full?.ownerApplications[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-100">{m(locale, "profile.title")}</h1>

      <div className="liquid-glass rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-100">{full?.name}</div>
            <div className="text-sm text-slate-300">{full?.email ?? "-"}</div>
          </div>
          <div className="text-sm text-slate-300">
            <div>
              {m(locale, "profile.phone")}:{" "}
              {full?.phone && !isPlaceholderAccountPhone(full.phone) ? full.phone : m(locale, "profile.phoneNotSet")}
            </div>
            <div>{m(locale, "profile.role")}: {full?.role}</div>
          </div>
        </div>
        {full?.role === "GUEST" && (
          <p className="mt-3 text-sm text-slate-300">
            {m(locale, "profile.statsGuest", { favorites: full.favorites.length, bookings: full.bookings.length })}
          </p>
        )}
        {full?.role === "OWNER" && <p className="mt-3 text-sm text-slate-300">{m(locale, "profile.statsOwner", { count: full.hotels.length })}</p>}
      </div>

      {full?.role === "GUEST" && latestApp && (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm">
          <div className="font-medium text-amber-100">{m(locale, "profile.ownerApplication")}</div>
          {latestApp.status === OWNER_APPLICATION_STATUS.PENDING && (
            <p className="mt-1 text-amber-200">{m(locale, "profile.ownerPending")}</p>
          )}
          {latestApp.status === OWNER_APPLICATION_STATUS.REJECTED && (
            <p className="mt-1 text-red-300">
              {m(locale, "profile.ownerRejected")}
              {latestApp.comment ? `: ${latestApp.comment}` : ""}.{" "}
              <Link href="/profile/become-owner" className="font-medium underline">
                {m(locale, "profile.applyAgain")}
              </Link>
            </p>
          )}
          {latestApp.status === OWNER_APPLICATION_STATUS.APPROVED && (
            <p className="mt-1 text-emerald-300">{m(locale, "profile.ownerApproved")}</p>
          )}
        </div>
      )}

      {full?.role === "GUEST" && (ownerNav.kind === "none" || ownerNav.kind === "rejected") && (
        <Link href="/profile/become-owner" className="ds-primary-btn inline-flex items-center text-sm">
          {m(locale, "profile.becomeOwner")}
        </Link>
      )}

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
