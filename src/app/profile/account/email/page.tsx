import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { PageContainer } from "@/components/ds";
import { ProfileEmailChangeClient } from "@/components/profile/ProfileEmailChangeClient";

export const dynamic = "force-dynamic";

export default async function ProfileAccountEmailPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/account/email");

  return (
    <PageContainer width="narrow" className="pb-10">
      <ProfileEmailChangeClient locale={locale} />
    </PageContainer>
  );
}
