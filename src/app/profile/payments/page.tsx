import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";

export const dynamic = "force-dynamic";

export default async function ProfilePaymentsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/payments");

  const paidCount = await prisma.booking.count({
    where: { userId: user.id, paymentStatus: "PAID" }
  });

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.payments")} subtitle={m(locale, "profile.paymentsSubtitle")}>
      <div className="profile-panel profile-panel--stack">
        <p className="text-sm text-[var(--text-secondary)]">{m(locale, "profile.paymentsDesc")}</p>
        <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.paymentsPaidCount", { count: paidCount })}</p>
      </div>
      <div className="profile-actions">
        <Link href="/history?tab=all" className="profile-actions__item">
          <span className="flex-1 text-sm font-medium">{m(locale, "tripsHub.tabAll")}</span>
          <span className="text-[var(--text-muted)]">›</span>
        </Link>
        <Link href="/history?tab=past" className="profile-actions__item">
          <span className="flex-1 text-sm font-medium">{m(locale, "profile.paymentHistory")}</span>
          <span className="text-[var(--text-muted)]">›</span>
        </Link>
      </div>
    </ProfileSubpageShell>
  );
}
