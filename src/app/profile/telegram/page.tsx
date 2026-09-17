import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatTelegram } from "@/lib/format/maskEmail";
import { ProfileTelegramLinkClient } from "@/components/profile/ProfileTelegramLinkClient";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

export default async function ProfileTelegramPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) redirect("/auth/sign-in?next=/profile/telegram");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const connected = Boolean(full.telegramId || full.telegramUsername);
  const value =
    formatTelegram(full.telegramUsername, full.telegramId) ?? m(locale, "profile.telegramNotConnected");

  if (!isTelegramLoginConfigured()) {
    return (
      <ProfileTelegramLinkClient
        locale={locale}
        currentDisplay={value}
        connected={connected}
        labels={{
          title: m(locale, "profile.telegram"),
          subtitle: m(locale, "profile.contactTelegramSubtitle"),
          currentLabel: connected
            ? m(locale, "profile.telegramLink.currentConnected")
            : m(locale, "profile.telegramNotConnected"),
          connect: m(locale, "profile.connectTelegram"),
          change: m(locale, "profile.telegramLink.change"),
          openTelegram: m(locale, "profile.telegramLink.openBot"),
          waiting: m(locale, "profile.telegramLink.waiting"),
          success: m(locale, "profile.telegramLink.success"),
          hint: m(locale, "profile.telegramLink.notConfigured"),
          errors: { generic: m(locale, "profile.telegramLink.errGeneric"), not_configured: m(locale, "profile.telegramLink.notConfigured") }
        }}
      />
    );
  }

  return (
    <ProfileTelegramLinkClient
      locale={locale}
      currentDisplay={value}
      connected={connected}
      labels={{
        title: m(locale, "profile.telegram"),
        subtitle: m(locale, "profile.contactTelegramSubtitle"),
        currentLabel: connected
          ? m(locale, "profile.telegramLink.currentConnected")
          : m(locale, "profile.telegramNotConnected"),
        connect: m(locale, "profile.connectTelegram"),
        change: m(locale, "profile.telegramLink.change"),
        openTelegram: m(locale, "profile.telegramLink.openBot"),
        waiting: m(locale, "profile.telegramLink.waiting"),
        success: m(locale, "profile.telegramLink.success"),
        hint: m(locale, "profile.telegramLink.hint"),
        errors: {
          unauthorized: m(locale, "profile.telegramLink.errAuth"),
          rate_limited: m(locale, "profile.telegramLink.errRate"),
          not_configured: m(locale, "profile.telegramLink.notConfigured"),
          expired: m(locale, "profile.telegramLink.errExpired"),
          used: m(locale, "profile.telegramLink.errExpired"),
          telegram_taken: m(locale, "profile.telegramLink.errTaken"),
          conflict: m(locale, "profile.telegramLink.errTaken"),
          generic: m(locale, "profile.telegramLink.errGeneric")
        }
      }}
    />
  );
}
