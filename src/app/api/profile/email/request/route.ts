import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { requestProfileEmailChange } from "@/lib/profile/emailChange";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const locale = getLocale();

  const result = await requestProfileEmailChange(user.id, email);
  if (!result.ok) {
    if (result.reason === "invalid") return profileError(m(locale, "profile.errEmailInvalid"));
    if (result.reason === "taken") return profileError(m(locale, "profile.errEmailTaken"));
    return profileError(m(locale, "profile.errEmailSend"));
  }

  return profileOk({ email: result.email });
}
