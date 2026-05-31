import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";
import { ProfileSingleFieldForm } from "@/components/profile/ProfileSingleFieldForm";

export const dynamic = "force-dynamic";

export default async function ProfileEditSurnamePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/edit/surname");

  return (
    <PageContainer width="narrow" className="pb-10">
      <ProfileSingleFieldForm
        locale={locale}
        title={m(locale, "profile.lastName")}
        label={m(locale, "profile.newSurname")}
        fieldKey="surname"
        apiUrl="/api/profile/surname"
        backHref="/profile/edit"
      />
    </PageContainer>
  );
}
