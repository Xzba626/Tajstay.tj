import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfilePhoneForm } from "@/components/profile/ProfilePhoneForm";
import { phoneToNationalDigits } from "@/lib/profile/phoneDisplay";

export const dynamic = "force-dynamic";

export default async function ProfilePhonePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/phone");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.phone")} subtitle={m(locale, "profile.contactPhoneSubtitle")}>
      <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.contactPhoneHint")}</p>
      <ProfilePhoneForm locale={locale} initialNational={phoneToNationalDigits(full.phone)} />
    </ProfileSubpageShell>
  );
}
