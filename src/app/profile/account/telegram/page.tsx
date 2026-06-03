import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";
import { ProfileTelegramChangeClient } from "@/components/profile/ProfileTelegramChangeClient";
import { formatTelegram } from "@/lib/format/maskEmail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfileAccountTelegramPage() {
  const locale = getLocale();
  const sessionUser = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!sessionUser) redirect("/auth/sign-in?next=/profile/account/telegram");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { telegramId: true, telegramUsername: true }
  });
  if (!user) redirect("/auth/sign-in?next=/profile/account/telegram");

  const currentLabel =
    formatTelegram(user.telegramUsername, user.telegramId) ?? m(locale, "profile.telegramNotConnected");

  return (
    <PageContainer width="narrow" className="pb-10">
      <ProfileTelegramChangeClient
        locale={locale}
        currentTelegramLabel={currentLabel}
        currentTelegramId={user.telegramId}
      />
    </PageContainer>
  );
}
