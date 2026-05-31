import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { disconnectProfileTelegram } from "@/lib/profile/updateFields";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  try {
    await disconnectProfileTelegram(user.id);
    return profileOk();
  } catch {
    return profileError(m(getLocale(), "profile.errSave"));
  }
}
