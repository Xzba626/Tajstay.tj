"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { AdminOwnerApplicationReviewModal } from "@/components/admin/AdminOwnerApplicationReviewModal";

type Props = {
  locale: Locale;
  applicationId: number;
  applicationStatus: string;
};

export function AdminUserVerifyDocumentsButton({ locale, applicationId, applicationStatus }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
      >
        <FileSearch size={14} aria-hidden />
        {m(locale, "admin.verifyOwnerDocuments")}
        {applicationStatus === "PENDING" ? (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">!</span>
        ) : null}
      </button>
      <AdminOwnerApplicationReviewModal
        locale={locale}
        applicationId={applicationId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
