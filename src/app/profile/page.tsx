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
import { PageContainer } from "@/components/ds";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { HubLinkCard } from "@/components/navigation/HubLinkCard";
import { Building2, ClipboardList, Heart, MessageCircle, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <PageContainer width="narrow" className="space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--taj-color-text)]">{m(locale, "profile.title")}</h1>
        <p className="text-emerald-100/75">{m(locale, "profile.signInPrompt")}</p>
        <a className="taj-btn taj-btn--primary" href="/auth/sign-in">
          {m(locale, "profile.signInCta")}
        </a>
      </PageContainer>
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
    include: {
      booking: {
        include: {
          room: { include: { hotel: true } },
          roomType: { include: { hotel: true } }
        }
      }
    },
    orderBy: { id: "desc" },
    take: 20
  });

  return (
    <PageContainer width="narrow" className="space-y-6">
      <ScreenHeader title={m(locale, "profile.title")} subtitle={m(locale, "profile.hubSubtitle")} />

      <div className="profile-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-white">{full?.name}</div>
            <div className="mt-1 text-sm text-emerald-100/75">{full?.email ?? "—"}</div>
            <TrustBadges locale={locale} badges={trustBadges} size="md" className="mt-3" />
          </div>
          <div className="shrink-0 rounded-xl border border-emerald-400/15 bg-emerald-950/50 px-3 py-2 text-right text-xs text-emerald-200/70">
            <div>
              {m(locale, "profile.phone")}:{" "}
              <span className="font-medium text-white">
                {full?.phone && !isPlaceholderAccountPhone(full.phone) ? full.phone : m(locale, "profile.phoneNotSet")}
              </span>
            </div>
            <div className="mt-1">
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-100 ring-1 ring-emerald-400/25">
                {full?.role === "OWNER" ? m(locale, "profile.roleOwner") : full?.role === "ADMIN" ? m(locale, "profile.roleAdmin") : m(locale, "profile.roleGuest")}
              </span>
            </div>
          </div>
        </div>
        {full?.role === "GUEST" && (
          <p className="mt-3 text-sm text-emerald-100/70">
            {m(locale, "profile.statsGuest", { favorites: full.favorites.length, bookings: full.bookings.length })}
          </p>
        )}
        {full?.role === "OWNER" && <p className="mt-3 text-sm text-emerald-100/70">{m(locale, "profile.statsOwner", { count: full.hotels.length })}</p>}
      </div>

      <ProfileBecomeOwnerCard locale={locale} role={full?.role ?? "GUEST"} ownerNav={ownerNav} />

      <div className="app-hub-grid" aria-label={m(locale, "profile.title")}>
        <HubLinkCard
          href="/dashboard/bookings"
          title={m(locale, "tripsHub.title")}
          description={m(locale, "profile.navBookingsDesc")}
          icon={ClipboardList}
        />
        <HubLinkCard
          href="/dashboard/messages"
          title={m(locale, "profile.navMessages")}
          description={m(locale, "profile.navMessagesDesc")}
          icon={MessageCircle}
        />
        <HubLinkCard
          href="/favorites"
          title={m(locale, "profile.navFavorites")}
          description={m(locale, "profile.navFavoritesDesc")}
          icon={Heart}
          badge={full?.favorites.length}
        />
        {full?.role === "OWNER" ? (
          <HubLinkCard
            href="/dashboard/owner"
            title={m(locale, "profile.navOwner")}
            description={m(locale, "profile.navOwnerDesc")}
            icon={Building2}
          />
        ) : null}
        {full?.role === "ADMIN" ? (
          <HubLinkCard
            href="/dashboard/admin"
            title={m(locale, "profile.navAdmin")}
            description={m(locale, "profile.navAdminDesc")}
            icon={Shield}
          />
        ) : null}
      </div>

      <section id="reviews" className="scroll-mt-24">
        <h2 className="mb-3 text-lg font-semibold text-white">{m(locale, "profile.reviewsTitle")}</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-emerald-200/50">{m(locale, "profile.reviewsEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="profile-card text-sm">
                <div className="font-medium text-white">
                  {r.booking.room?.hotel?.name ?? r.booking.roomType?.hotel?.name ?? "—"}
                </div>
                <div className="text-emerald-100/70">{r.rating} ★ · {r.comment}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LogoutButton label={m(locale, "userMenu.logout")} />
    </PageContainer>
  );
}
