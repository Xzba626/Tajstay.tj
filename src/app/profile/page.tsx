import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileHubView } from "@/components/profile/ProfileHubView";
import { PageContainer } from "@/components/ds";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <PageContainer width="narrow" className="mockup-screen">
        <h1 className="mockup-screen__title">{m(locale, "profile.title")}</h1>
        <p className="mockup-screen__subtitle">{m(locale, "profile.signInPrompt")}</p>
        <a className="btn-primary mt-4 inline-flex !w-auto px-6" href="/auth/sign-in">
          {m(locale, "profile.signInCta")}
        </a>
      </PageContainer>
    );
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: { bookings: true, favorites: true }
  });

  if (!full) return null;

  return (
    <PageContainer width="narrow" className="profile-hub-page pb-6">
      <ProfileHubView locale={locale} user={full} logoutLabel={m(locale, "userMenu.logout")} />
    </PageContainer>
  );
}
