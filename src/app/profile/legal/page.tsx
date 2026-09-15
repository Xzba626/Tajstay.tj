import { redirect } from "next/navigation";
import { FileText, ScrollText } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup, ProfileSubpageRow } from "@/components/profile/ProfileSubpageRow";

export const dynamic = "force-dynamic";

/**
 * MASTER COMPLETION BLOCK, PHASE B: "Юридические документы" was missing from Profile entirely —
 * Privacy/Terms were only reachable from Settings (mixed in with unrelated app settings) or the
 * public footer. This is its own top-level Profile section now, per spec.
 *
 * Only the two documents that actually exist and are backed by real, admin-editable content
 * (confirmed live end-to-end: Admin Content -> SiteContentState -> /policy, /terms) are listed.
 * No other legal document (cookie policy, refund policy, etc.) exists in this codebase — not
 * invented here, since fabricating legal-sounding content this project hasn't actually approved
 * would be worse than a shorter list.
 */
export default async function ProfileLegalPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/legal");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.legal")}>
      <ProfileSubpageGroup>
        <ProfileSubpageRow href="/policy" icon={FileText} label={m(locale, "footer.policy")} />
        <ProfileSubpageRow href="/terms" icon={ScrollText} label={m(locale, "footer.terms")} />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
