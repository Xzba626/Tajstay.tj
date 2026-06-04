import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { PageContainer } from "@/components/ds";
import { ProfileEditClient } from "@/components/profile/ProfileEditClient";
import { resolveUserNames } from "@/lib/profile/userName";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/edit");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const { fullName, firstName, lastName } = resolveUserNames(full);

  return (
    <PageContainer width="narrow" className="profile-edit-page pb-4">
      <ProfileEditClient
        locale={locale}
        fullName={fullName}
        firstName={firstName}
        lastName={lastName}
        imageUrl={full.image ?? full.telegramPhotoUrl}
      />
    </PageContainer>
  );
}
