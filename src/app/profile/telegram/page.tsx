import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatTelegram } from "@/lib/format/maskEmail";
import { ProfileContactMockup } from "@/components/profile/ProfileContactMockup";

export const dynamic = "force-dynamic";

export default async function ProfileTelegramPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/telegram");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const connected = Boolean(full.telegramId || full.telegramUsername);
  const value = formatTelegram(full.telegramUsername, full.telegramId) ?? m(locale, "profile.telegramNotConnected");

  return (
    <ProfileContactMockup
      locale={locale}
      title={m(locale, "profile.telegram")}
      subtitle={m(locale, "profile.contactTelegramSubtitle")}
      icon={Send}
      value={value}
      hint={m(locale, "profile.contactTelegramHint")}
      actionHref={connected ? "/profile/personal" : "/auth/sign-in?next=/profile/telegram"}
      actionLabel={connected ? m(locale, "profile.viewProfile") : m(locale, "profile.connectTelegram")}
      verified={connected}
      verifiedLabel={m(locale, "profile.statusVerified")}
    />
  );
}
