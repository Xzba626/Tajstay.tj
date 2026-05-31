import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, Phone, Send, Lock, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";

export const dynamic = "force-dynamic";

export default async function ProfileAccountPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/account");

  const items = [
    { href: "/profile/account/email", icon: Mail, label: m(locale, "profile.email") },
    { href: "/profile/account/phone", icon: Phone, label: m(locale, "profile.phone") },
    { href: "/profile/account/telegram", icon: Send, label: m(locale, "profile.telegram") },
    { href: "/profile/account/password", icon: Lock, label: m(locale, "profile.changePassword") }
  ];

  return (
    <PageContainer width="narrow" className="pb-10">
      <div className="mockup-screen">
        <Link href="/profile" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
          ← {m(locale, "common.back")}
        </Link>
        <h1 className="mockup-screen__title">{m(locale, "profile.sectionAccount")}</h1>
        <nav className="mockup-menu mt-4">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="mockup-menu__item">
              <item.icon size={18} className="shrink-0 text-[var(--text-secondary)]" />
              <span>{item.label}</span>
              <ChevronRight size={16} className="ml-auto text-[var(--text-muted)]" />
            </Link>
          ))}
        </nav>
      </div>
    </PageContainer>
  );
}
