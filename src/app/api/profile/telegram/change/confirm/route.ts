import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { confirmTelegramChange } from "@/lib/profile/telegramChange";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const sessionToken = String(body.sessionToken ?? "");
  const code = String(body.code ?? "");
  const locale = getLocale();

  const result = await confirmTelegramChange(user.id, sessionToken, code);
  if (!result.ok) {
    if (result.reason === "expired") return profileError(m(locale, "auth.telegramExpired"));
    if (result.reason === "taken") return profileError(m(locale, "profile.errTelegramTaken"));
    if (result.reason === "no_code") return profileError(m(locale, "profile.errTelegramLink"));
    return profileError(m(locale, "profile.errTelegramCode"));
  }

  return profileOk();
}
