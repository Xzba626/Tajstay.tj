import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { EmptyStateCard } from "@/components/ds";

export function OwnerEmptyState() {
  const locale = getLocale();
  return (
    <EmptyStateCard
      align="start"
      title={m(locale, "owner.emptyTitle")}
      description={m(locale, "owner.emptyText")}
      actions={
        <>
          <Link href="/dashboard/owner?section=properties" className="taj-btn taj-btn--primary">
            {m(locale, "owner.addPropertyCta")}
          </Link>
          <a href="mailto:support@tajstay.local?subject=TajStay%20support" className="taj-btn taj-btn--secondary">
            {m(locale, "owner.contactAdmin")}
          </a>
        </>
      }
      className="relative overflow-hidden ring-1 ring-white/5"
    />
  );
}
