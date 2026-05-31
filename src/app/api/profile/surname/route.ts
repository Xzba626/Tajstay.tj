import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { updateProfileLastName } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const surname = String(body.surname ?? "").trim();
  const locale = getLocale();

  try {
    await updateProfileLastName(user.id, surname);
    return profileOk();
  } catch {
    return profileError(m(locale, "profile.errSave"));
  }
}
