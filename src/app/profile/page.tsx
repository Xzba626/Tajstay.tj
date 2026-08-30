import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileMockupView } from "@/components/profile/ProfileMockupView";
import { PageContainer } from "@/components/ds";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <PageContainer width="default" className="pb-10 profile-page-light">
        <div className="profile-center profile-center--guest">
          <h1 className="profile-center__title">{m(locale, "profile.title")}</h1>
          <p className="profile-center__signin-copy">{m(locale, "profile.signInPrompt")}</p>
          <a className="btn-primary inline-flex !w-auto px-6" href="/auth/sign-in?next=/profile">
            {m(locale, "profile.signInCta")}
          </a>
        </div>
      </PageContainer>
    );
  }

  const [full, unreadNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        bookings: true,
        favorites: true
      }
    }),
    getUnreadNotificationsCount(user.id)
  ]);

  if (!full) return null;

  return (
    <PageContainer width="default" className="pb-10 profile-page-light">
      <ProfileMockupView
        locale={locale}
        user={full}
        logoutLabel={m(locale, "userMenu.logout")}
        unreadNotifications={unreadNotifications}
      />
    </PageContainer>
  );
}
