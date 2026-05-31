import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { confirmProfileEmailChange } from "@/lib/profile/emailChange";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const code = String(body.code ?? "");
  const locale = getLocale();

  const result = await confirmProfileEmailChange(user.id, email, code);
  if (!result.ok) {
    if (result.reason === "too_many") return profileError(m(locale, "profile.errTooManyAttempts"), 429);
    if (result.reason === "taken") return profileError(m(locale, "profile.errEmailTaken"));
    return profileError(m(locale, "profile.errEmailCode"));
  }

  return profileOk();
}
