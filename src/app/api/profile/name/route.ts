import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { mapProfileUniqueError, profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { updateProfileFirstName } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const locale = getLocale();

  try {
    await updateProfileFirstName(user.id, name);
    return profileOk();
  } catch (err) {
    if (err instanceof Error && err.message === "NAME_TOO_SHORT") {
      return profileError(m(locale, "profile.errNameTooShort"));
    }
    if (mapProfileUniqueError(err) !== "unknown") return profileError(m(locale, "profile.errTaken"));
    return profileError(m(locale, "profile.errSave"));
  }
}
