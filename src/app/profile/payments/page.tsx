import Link from "next/link";
import { redirect } from "next/navigation";
import { History, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup, ProfileSubpageRow } from "@/components/profile/ProfileSubpageRow";

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
      <div className="profile-panel">
        <p className="profile-panel__body">{m(locale, "profile.paymentsDesc")}</p>
        <p className="profile-panel__meta">{m(locale, "profile.paymentsPaidCount", { count: paidCount })}</p>
      </div>

      <ProfileSubpageGroup title={m(locale, "profile.sectionMain")}>
        <ProfileSubpageRow href="/history?tab=all" icon={Receipt} label={m(locale, "tripsHub.tabAll")} />
        <ProfileSubpageRow href="/history?tab=past" icon={History} label={m(locale, "profile.paymentHistory")} />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
