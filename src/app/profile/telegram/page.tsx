import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatTelegram } from "@/lib/format/maskEmail";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileTelegramSection } from "@/components/profile/ProfileTelegramSection";

export const dynamic = "force-dynamic";

export default async function ProfileTelegramPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/telegram");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const connected = Boolean(full.telegramId);
  const displayValue = formatTelegram(full.telegramUsername, full.telegramId) ?? m(locale, "profile.telegramNotConnected");

  const telegramLabels = {
    signIn: m(locale, "profile.connectTelegram"),
    title: m(locale, "profile.connectTelegram"),
    browserFallback: m(locale, "auth.telegramBrowserFallback"),
    codeExpired: m(locale, "auth.telegramExpired"),
    otpExpired: m(locale, "auth.telegramExpired"),
    expiresIn: m(locale, "auth.telegramExpiresIn"),
    requestNew: m(locale, "auth.otpRequestNew"),
    backToSignIn: m(locale, "common.back"),
    verifying: m(locale, "auth.telegramVerifying"),
    codeSuccess: m(locale, "auth.telegramCodeSuccess"),
    codeInvalid: m(locale, "auth.errInvalidOtp"),
    tooManyAttempts: m(locale, "auth.telegramTooManyAttempts"),
    errorGeneric: m(locale, "profile.errSave")
  };

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.telegram")} subtitle={m(locale, "profile.contactTelegramSubtitle")}>
      <ProfileTelegramSection locale={locale} connected={connected} displayValue={displayValue} labels={telegramLabels} />
    </ProfileSubpageShell>
  );
}
