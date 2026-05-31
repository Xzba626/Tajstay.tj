import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileEmailForm } from "@/components/profile/ProfileEmailForm";

export const dynamic = "force-dynamic";

export default async function ProfileEmailPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/email");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.email")} subtitle={m(locale, "profile.contactEmailSubtitle")}>
      <p className="text-sm text-[var(--text-muted)]">{m(locale, "profile.contactEmailHint")}</p>
      <ProfileEmailForm locale={locale} initialEmail={full.email?.trim() ?? ""} />
    </ProfileSubpageShell>
  );
}
