import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { mapProfileUniqueError, profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { clearProfileEmail, updateProfileEmail } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const clear = body.clear === true;
  const locale = getLocale();

  try {
    if (clear) {
      await clearProfileEmail(user.id);
    } else {
      await updateProfileEmail(user.id, email);
    }
    return profileOk();
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_INVALID") {
      return profileError(m(locale, "profile.errEmailInvalid"));
    }
    const unique = mapProfileUniqueError(err);
    if (unique === "email") return profileError(m(locale, "profile.errEmailTaken"));
    return profileError(m(locale, "profile.errSave"));
  }
}
