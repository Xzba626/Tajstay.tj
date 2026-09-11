import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { getOwnerOnboardingLabels } from "@/lib/i18n/ownerOnboarding";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { OwnerOnboardingExperience } from "@/components/owner-onboarding/OwnerOnboardingExperience";
import { m } from "@/lib/i18n/messages";

export default async function ProfileBecomeOwnerPage({
  searchParams
}: {
  searchParams?: { notice?: string };
}) {
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

  // Reached here because someone tried to open the Owner workspace without being an owner yet -
  // show a short, state-aware notice (never the internal "OWNER" role name) instead of a generic
  // access-denied banner.
  const showNotice = (searchParams?.notice ?? "").trim() === "ownerOnly";
  const noticeText = showNotice
    ? ownerNav.kind === "pending"
      ? m(locale, "ownerOnboarding.noticeAccessPending")
      : ownerNav.kind === "rejected"
        ? m(locale, "ownerOnboarding.noticeAccessRejected")
        : m(locale, "ownerOnboarding.noticeAccessNone")
    : null;

  return (
    <>
      {noticeText ? (
        <div
          className="mx-auto mb-4 max-w-lg rounded-xl bg-[#0f7a4d] px-4 py-3 text-sm font-medium text-white"
          role="status"
        >
          {noticeText}
        </div>
      ) : null}
      <OwnerOnboardingExperience
        locale={locale}
        L={L}
        ownerNav={ownerNav}
        defaults={{
          fullName: user.name?.trim() || "",
          phone: user.phone || "",
          email: user.email?.trim() || ""
        }}
      />
    </>
  );
}
