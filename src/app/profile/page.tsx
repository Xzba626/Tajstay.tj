import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { maskPhone } from "@/lib/format/maskPhone";
import { maskEmail, formatTelegram } from "@/lib/format/maskEmail";
import { ProfileBecomeOwnerCard } from "@/components/profile/ProfileBecomeOwnerCard";
import { ProfileMenuSections } from "@/components/profile/ProfileMenuSections";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileStatsGrid } from "@/components/profile/ProfileStatsGrid";
import { ProfileVerificationCard } from "@/components/profile/ProfileVerificationCard";
import { getProfileTrustPercent, getProfileVerification } from "@/lib/profile/trustScore";
import { filterBookingsByTab } from "@/lib/trips/classify";
import { PageContainer } from "@/components/ds";

export const dynamic = "force-dynamic";

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

  if (!full) {
    return null;
  }

  const ownerNav = await getOwnerApplicationNavState(user);
  const verification = getProfileVerification(full);
  const trustPercent = getProfileTrustPercent(full);
  const hasVerifiedPhone = Boolean(full.phone && !isPlaceholderAccountPhone(full.phone));
  const phoneDisplay = hasVerifiedPhone ? maskPhone(full.phone) : m(locale, "profile.phoneNotSet");
  const emailDisplay = maskEmail(full.email) ?? m(locale, "profile.emailNotSet");
  const telegramDisplay = formatTelegram(full.telegramUsername, full.telegramId) ?? m(locale, "profile.telegramNotConnected");
  const emailVerified = Boolean(full.emailVerified || (full.email?.trim() && full.verified));

  const reviewsCount = await prisma.review.count({ where: { booking: { userId: user.id } } });
  const activeTrips = filterBookingsByTab(full.bookings, "active").length;

  return (
    <PageContainer width="narrow" className="profile-page space-y-5 pb-10">
      <header className="pt-2">
        <h1 className="taj-display text-[28px] font-bold leading-tight text-[var(--text-primary)]">
          {m(locale, "profile.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{m(locale, "profile.hubSubtitle")}</p>
      </header>

      <section className="profile-hero-card">
        <div className="flex items-start gap-4">
          <ProfileAvatar name={full.name} imageUrl={full.image ?? full.telegramPhotoUrl} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{full.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{phoneDisplay}</p>
            <p className="text-sm text-[var(--text-secondary)]">{emailDisplay}</p>
            <p className="text-sm text-[var(--text-muted)]">{telegramDisplay}</p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              {hasVerifiedPhone && full.phoneVerified ? (
                <span className="profile-chip profile-chip--ok">✓ {m(locale, "profile.phoneVerified")}</span>
              ) : null}
              {full.email ? (
                <span className={`profile-chip ${emailVerified ? "profile-chip--ok" : "profile-chip--warn"}`}>
                  {emailVerified ? "✓" : "○"} {m(locale, "profile.email")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="profile-trust-bar mt-4" role="progressbar" aria-valuenow={trustPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="profile-trust-bar__fill" style={{ width: `${trustPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{m(locale, "profile.trustLevel", { percent: trustPercent })}</p>
      </section>

      {full.role === "GUEST" ? (
        <ProfileStatsGrid
          locale={locale}
          favorites={full.favorites.length}
          bookings={full.bookings.length}
          reviews={reviewsCount}
          trips={activeTrips}
        />
      ) : null}

      <ProfileVerificationCard locale={locale} items={verification} />

      <ProfileMenuSections locale={locale} role={full.role} logoutLabel={m(locale, "userMenu.logout")} />

      {full.role === "GUEST" ? (
        <ProfileBecomeOwnerCard locale={locale} role={full.role} ownerNav={ownerNav} />
      ) : null}
    </PageContainer>
  );
}
