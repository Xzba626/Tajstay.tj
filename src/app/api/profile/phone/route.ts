import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { mapProfileUniqueError, profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { updateProfilePhone } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone ?? "");
  const locale = getLocale();

  try {
    await updateProfilePhone(user.id, phone);
    return profileOk();
  } catch (err) {
    if (err instanceof Error && err.message === "PHONE_INVALID") {
      return profileError(m(locale, "profile.errPhoneInvalid"));
    }
    if (mapProfileUniqueError(err) === "phone") {
      return profileError(m(locale, "profile.errPhoneTaken"));
    }
    return profileError(m(locale, "profile.errSave"));
  }
}
