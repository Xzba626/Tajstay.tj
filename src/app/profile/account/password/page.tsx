import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { PageContainer } from "@/components/ds";
import { ProfilePasswordClient } from "@/components/profile/ProfilePasswordClient";

export const dynamic = "force-dynamic";

export default async function ProfileAccountPasswordPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/account/password");

  return (
    <PageContainer width="narrow" className="pb-10">
      <ProfilePasswordClient locale={locale} />
    </PageContainer>
  );
}
