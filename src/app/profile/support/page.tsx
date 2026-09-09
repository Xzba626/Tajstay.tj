import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleHelp, FileText, MessageCircle, ScrollText, ChevronRight, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";

export const dynamic = "force-dynamic";

function SupportRow({ href, icon: Icon, title }: { href: string; icon: LucideIcon; title: string }) {
  return (
    <Link href={href} className="profile-hub__nav-block">
      <Icon size={18} className="profile-hub__nav-block-icon" aria-hidden />
      <span className="profile-hub__nav-block-copy">
        <span className="profile-hub__nav-block-title">{title}</span>
      </span>
      <ChevronRight size={16} className="profile-hub__nav-block-chevron" aria-hidden />
    </Link>
  );
}

export default async function ProfileSupportPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/support");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.sectionSupport")}>
      <div className="profile-hub__nav-group">
        <SupportRow href="/faq" icon={CircleHelp} title={m(locale, "footer.helpCenter")} />
        <SupportRow href="/contacts" icon={MessageCircle} title={m(locale, "footer.contactUs")} />
        <SupportRow href="/policy" icon={FileText} title={m(locale, "footer.policy")} />
        <SupportRow href="/terms" icon={ScrollText} title={m(locale, "footer.terms")} />
      </div>
    </ProfileSubpageShell>
  );
}
