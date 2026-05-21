import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import Link from "next/link";
import { ApplyOwnerForm } from "@/app/apply/owner/ApplyOwnerForm";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getOwnerApplicationNavState } from "@/lib/navigation/getNavContext";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";

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

  const formLabels = {
    fullName: m(locale, "applyOwner.fullName"),
    phone: m(locale, "applyOwner.phone"),
    email: m(locale, "applyOwner.email"),
    businessName: m(locale, "applyOwner.businessName"),
    documentUrl: m(locale, "applyOwner.documentUrl"),
    documentUrlHelp: m(locale, "applyOwner.documentUrlHelp"),
    photoUpload: m(locale, "applyOwner.photoUpload"),
    photoUploadHelp: m(locale, "applyOwner.photoUploadHelp"),
    privacyNote: m(locale, "applyOwner.privacyNote"),
    submit: m(locale, "applyOwner.submit"),
    sending: m(locale, "applyOwner.sending"),
    errHttps: m(locale, "applyOwner.errHttps")
  };

  return (
    <div className="mx-auto flex w-[94%] max-w-3xl flex-col justify-center px-0 py-6 sm:w-full sm:px-4 sm:py-14">
      <header className="mb-6">
        <Link href="/profile" className="text-sm font-semibold text-brand-200 hover:text-white">
          ← {m(locale, "profile.title")}
        </Link>
        <h1 className="mt-4 text-[clamp(1.6rem,6vw,2rem)] font-bold tracking-tight text-slate-100">
          {m(locale, "profile.becomeOwner")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{m(locale, "applyOwner.formHint")}</p>
      </header>

      {ownerNav.kind === "pending" && (
        <div className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm text-amber-200">
          {m(locale, "profile.ownerPending")}
        </div>
      )}

      {ownerNav.kind === "approved" && (
        <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {m(locale, "profile.ownerApproved")}
        </div>
      )}

      {ownerNav.kind === "rejected" && (
        <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">
          {m(locale, "profile.ownerRejected")}
          {ownerNav.kind === "rejected" && ownerNav.comment ? `: ${ownerNav.comment}` : ""}
        </div>
      )}

      {(ownerNav.kind === "none" || ownerNav.kind === "rejected") && <ApplyOwnerForm labels={formLabels} />}
    </div>
  );
}
