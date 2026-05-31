import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { startTelegramChangeSession } from "@/lib/profile/telegramChange";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isTelegramLoginConfigured()) {
    return profileError("Telegram is not configured", 503);
  }

  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const session = await startTelegramChangeSession(user.id);
  return profileOk(session);
}
