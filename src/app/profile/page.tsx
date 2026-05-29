import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { maskPhone } from "@/lib/format/maskPhone";
import { ProfileBecomeOwnerCard } from "@/components/profile/ProfileBecomeOwnerCard";
import { ProfileActionsList } from "@/components/profile/ProfileActionsList";
import { TrustBadges } from "@/components/auth/TrustBadges";
import { getUserTrustBadges } from "@/lib/auth/trustBadges";
import { PageContainer } from "@/components/ds";

export const dynamic = "force-dynamic";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default async function ProfilePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <PageContainer width="narrow" className="space-y-3">
        <h1 className="taj-display text-2xl font-semibold text-[var(--text-primary)]">{m(locale, "profile.title")}</h1>
        <p className="text-[var(--text-secondary)]">{m(locale, "profile.signInPrompt")}</p>
        <a className="btn-primary inline-flex !w-auto px-6" href="/auth/sign-in">
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
  const hasVerifiedPhone = Boolean(full?.phone && !isPlaceholderAccountPhone(full.phone));
  const phoneDisplay = hasVerifiedPhone ? maskPhone(full!.phone!) : m(locale, "profile.phoneNotSet");

  return (
    <PageContainer width="narrow" className="space-y-5 pb-8">
      <header className="pt-2">
        <h1 className="taj-display text-[28px] font-bold leading-tight text-[var(--text-primary)]">
          {m(locale, "profile.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{m(locale, "profile.hubSubtitle")}</p>
      </header>

      <section className="profile-hero premium-card !p-5">
        <div className="flex items-start gap-4">
          <div className="profile-hero__avatar" aria-hidden>
            {initials(full?.name ?? "Guest")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-[var(--text-primary)]">{full?.name}</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{phoneDisplay}</div>
            {hasVerifiedPhone ? (
              <p className="mt-1 text-xs text-[var(--green-accent)]">✓ {m(locale, "profile.phoneVerified")}</p>
            ) : null}
            <TrustBadges locale={locale} badges={trustBadges} size="md" className="mt-2" />
          </div>
        </div>

        {full?.role === "GUEST" ? (
          <div className="profile-stats-row text-sm">
            <div>
              <span className="text-[var(--text-muted)]">{m(locale, "profile.statFavorites")}: </span>
              <span className="font-semibold text-[var(--text-primary)]">{full.favorites.length}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">{m(locale, "profile.statBookings")}: </span>
              <span className="font-semibold text-[var(--text-primary)]">{full.bookings.length}</span>
            </div>
          </div>
        ) : null}
        {full?.role === "OWNER" ? (
          <p className="profile-stats-row mb-0 border-0 pt-3 text-sm text-[var(--text-secondary)]">
            {m(locale, "profile.statsOwner", { count: full.hotels.length })}
          </p>
        ) : null}
      </section>

      <ProfileActionsList locale={locale} role={full?.role ?? "GUEST"} logoutLabel={m(locale, "userMenu.logout")} />

      {full?.role === "GUEST" ? (
        <ProfileBecomeOwnerCard locale={locale} role={full.role} ownerNav={ownerNav} />
      ) : null}
    </PageContainer>
  );
}
