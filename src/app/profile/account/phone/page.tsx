import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { PageContainer } from "@/components/ds";
import { ProfilePhoneClient } from "@/components/profile/ProfilePhoneClient";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { formatTajikNationalDisplay } from "@/lib/validation/phone";

export const dynamic = "force-dynamic";

export default async function ProfileAccountPhonePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/account/phone");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile/account");

  let initialNational = "";
  if (full.phone && !isPlaceholderAccountPhone(full.phone)) {
    const digits = full.phone.replace(/\D/g, "").replace(/^992/, "");
    initialNational = formatTajikNationalDisplay(digits);
  }

  return (
    <PageContainer width="narrow" className="pb-10">
      <ProfilePhoneClient locale={locale} initialNational={initialNational} />
    </PageContainer>
  );
}
