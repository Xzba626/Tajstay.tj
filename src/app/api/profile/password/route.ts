import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { updateProfilePassword } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  const confirm = String(body.confirm ?? "");
  const locale = getLocale();

  if (password !== confirm) {
    return profileError(m(locale, "profile.errPasswordMismatch"));
  }

  try {
    await updateProfilePassword(user.id, password);
    return profileOk();
  } catch (err) {
    if (err instanceof Error && err.message === "PASSWORD_TOO_SHORT") {
      return profileError(m(locale, "profile.errPasswordShort"));
    }
    return profileError(m(locale, "profile.errSave"));
  }
}
