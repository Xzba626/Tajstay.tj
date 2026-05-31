import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";
import { resolveUserNames } from "@/lib/profile/userName";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/edit");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const { fullName } = resolveUserNames(full);

  const rows = [
    { href: "/profile/edit/name", label: m(locale, "profile.firstName") },
    { href: "/profile/edit/surname", label: m(locale, "profile.lastName") }
  ];

  return (
    <PageContainer width="narrow" className="pb-10">
      <div className="mockup-screen">
        <Link href="/profile" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
          ← {m(locale, "common.back")}
        </Link>
        <h1 className="mockup-screen__title">{m(locale, "profile.editProfile")}</h1>

        <ProfilePhotoUpload locale={locale} name={fullName} imageUrl={full.image ?? full.telegramPhotoUrl} />

        <nav className="mockup-menu mt-4">
          {rows.map((row) => (
            <Link key={row.href} href={row.href} className="mockup-menu__item">
              <span>{row.label}</span>
              <ChevronRight size={16} className="ml-auto text-[var(--text-muted)]" />
            </Link>
          ))}
        </nav>
      </div>
    </PageContainer>
  );
}
