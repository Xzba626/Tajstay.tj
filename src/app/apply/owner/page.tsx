import { requireUser } from "@/lib/auth/requireAuth";
import Link from "next/link";
import { ApplyOwnerForm } from "./ApplyOwnerForm";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default async function ApplyOwnerPage() {
  const user = await requireUser(["GUEST"]);
  const locale = getLocale();

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

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-3 py-6 sm:px-4 sm:py-14">
        <div className="surface-1 rounded-3xl p-5 text-center sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">{m(locale, "applyOwner.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{m(locale, "applyOwner.signInHint")}</p>
          <Link
            href="/auth/sign-in"
            className="brand-gradient focus-ring mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40"
          >
            {m(locale, "header.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-[94%] max-w-3xl flex-col justify-center px-0 py-6 sm:w-full sm:px-4 sm:py-14">
      <header className="mb-8 text-center sm:text-left">
        <h1 className="text-[clamp(1.6rem,6vw,2rem)] font-bold tracking-tight text-slate-100">{m(locale, "applyOwner.formTitle")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:mx-0">{m(locale, "applyOwner.formHint")}</p>
      </header>
      <ApplyOwnerForm labels={formLabels} />
    </div>
  );
}
