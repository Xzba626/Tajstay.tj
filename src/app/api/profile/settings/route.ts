import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { updateProfileSettings } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

const CURRENCIES = new Set(["TJS", "RUB", "USD"]);
const THEMES = new Set(["light", "dark", "system"]);

export async function PATCH(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const preferredCurrency = body.preferredCurrency ? String(body.preferredCurrency).toUpperCase() : undefined;
  const preferredTheme = body.preferredTheme ? String(body.preferredTheme) : undefined;

  if (preferredCurrency && !CURRENCIES.has(preferredCurrency)) {
    return profileError(m(getLocale(), "profile.errSave"));
  }
  if (preferredTheme && !THEMES.has(preferredTheme)) {
    return profileError(m(getLocale(), "profile.errSave"));
  }

  await updateProfileSettings(user.id, { preferredCurrency, preferredTheme });
  return profileOk();
}
