import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { PageContainer } from "@/components/ds";
import { ProfileTelegramChangeClient } from "@/components/profile/ProfileTelegramChangeClient";

export const dynamic = "force-dynamic";

export default async function ProfileAccountTelegramPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/account/telegram");

  return (
    <PageContainer width="narrow" className="pb-10">
      <ProfileTelegramChangeClient locale={locale} />
    </PageContainer>
  );
}
