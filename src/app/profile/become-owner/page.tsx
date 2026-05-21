import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { getOwnerOnboardingLabels } from "@/lib/i18n/ownerOnboarding";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { OwnerOnboardingExperience } from "@/components/owner-onboarding/OwnerOnboardingExperience";

export default async function ProfileBecomeOwnerPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent("/profile/become-owner")}`);
  }

  if (user.role === "OWNER" || user.role === "ADMIN") {
    redirect(user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/owner");
  }

  const ownerNav = await getOwnerApplicationNavState(user);
  const L = getOwnerOnboardingLabels(locale);

  return (
    <OwnerOnboardingExperience
      L={L}
      ownerNav={ownerNav}
      defaults={{
        fullName: user.name?.trim() || "",
        phone: user.phone || "",
        email: user.email?.trim() || ""
      }}
    />
  );
}
