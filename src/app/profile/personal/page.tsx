import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileNameForm } from "@/components/profile/ProfileNameForm";

export const dynamic = "force-dynamic";

export default async function ProfilePersonalPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/personal");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const reviews = await prisma.review.count({ where: { booking: { userId: user.id } } });

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.personalInfo")} subtitle={m(locale, "profile.personalSubtitle")}>
      <div className="profile-panel flex items-center gap-4">
        <ProfileAvatar name={full.name} imageUrl={full.image ?? full.telegramPhotoUrl} />
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{full.name}</p>
          <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.personalPhotoHint")}</p>
        </div>
      </div>

      <ProfileNameForm locale={locale} initialName={full.name} />

      <div className="profile-panel profile-panel--stack">
        <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.hubSubtitle")}</p>
        <div className="flex flex-col gap-2">
          <Link href="/profile/phone" className="profile-actions__item">
            <span className="text-sm font-medium">{m(locale, "profile.phone")}</span>
            <span className="text-[var(--text-muted)]">›</span>
          </Link>
          <Link href="/profile/email" className="profile-actions__item">
            <span className="text-sm font-medium">{m(locale, "profile.email")}</span>
            <span className="text-[var(--text-muted)]">›</span>
          </Link>
          <Link href="/profile/telegram" className="profile-actions__item">
            <span className="text-sm font-medium">{m(locale, "profile.telegram")}</span>
            <span className="text-[var(--text-muted)]">›</span>
          </Link>
          <Link href="/profile/security" className="profile-actions__item">
            <span className="text-sm font-medium">{m(locale, "profile.security")}</span>
            <span className="text-[var(--text-muted)]">›</span>
          </Link>
        </div>
      </div>

      <section id="reviews" className="profile-panel profile-panel--stack scroll-mt-24">
        <h2 className="profile-panel__title">{m(locale, "profile.reviewsTitle")}</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {reviews > 0 ? m(locale, "profile.reviewsCount", { count: reviews }) : m(locale, "profile.reviewsEmpty")}
        </p>
      </section>
    </ProfileSubpageShell>
  );
}
