import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { saveProfileAvatar } from "@/lib/profile/saveAvatar";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return profileError(m(getLocale(), "profile.errPhotoRequired"));
  }

  try {
    const imageUrl = await saveProfileAvatar(user.id, file);
    return profileOk({ imageUrl });
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return profileError(err.message);
    }
    return profileError(m(getLocale(), "profile.errSave"));
  }
}
