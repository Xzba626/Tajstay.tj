import { redirect } from "next/navigation";
import { Phone } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { maskPhone } from "@/lib/format/maskPhone";
import { ProfileContactMockup } from "@/components/profile/ProfileContactMockup";

export const dynamic = "force-dynamic";

export default async function ProfilePhonePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/phone");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const hasPhone = Boolean(full.phone && !isPlaceholderAccountPhone(full.phone));
  const value = hasPhone ? maskPhone(full.phone) : m(locale, "profile.phoneNotSet");

  return (
    <ProfileContactMockup
      locale={locale}
      title={m(locale, "profile.phone")}
      subtitle={m(locale, "profile.contactPhoneSubtitle")}
      icon={Phone}
      value={value}
      hint={m(locale, "profile.contactPhoneHint")}
      actionHref="/auth/sign-in?next=/profile/phone"
      actionLabel={m(locale, "profile.changePhone")}
      verified={hasPhone && full.phoneVerified}
      verifiedLabel={m(locale, "profile.statusVerified")}
    />
  );
}
