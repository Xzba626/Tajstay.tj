import type { ReactNode } from "react";
import { OwnerSidebar, type OwnerSidebarLabels } from "@/components/dashboard/OwnerSidebar";
import { DashboardShell } from "@/components/ds";
import { OwnerMobileShell, type OwnerMobileShellLabels } from "@/components/owner/mobile/OwnerMobileShell";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { requireOwner } from "@/lib/auth/requireOwner";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";
import { resolveUserNames } from "@/lib/profile/userName";

export default async function OwnerDashboardLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
  const owner = await requireOwner();
  const { fullName } = resolveUserNames(owner);
  const unreadNotifications = await getUnreadNotificationsCount(owner.id);

  const labels: OwnerSidebarLabels = {
    sectionTitle: m(locale, "roles.OWNER"),
    navLabel: m(locale, "owner.mobileNav"),
    mobileNav: m(locale, "owner.mobileNav"),
    navHint: m(locale, "owner.navHint"),
    items: {
      overview: m(locale, "owner.navOverview"),
      properties: m(locale, "owner.navProperties"),
      rooms: m(locale, "owner.navRooms"),
      bookings: m(locale, "owner.navBookings"),
      offlineBookings: m(locale, "owner.navOfflineBookings"),
      calendar: m(locale, "owner.navCalendar"),
      messages: m(locale, "owner.navMessages"),
      reviews: m(locale, "owner.navReviews"),
      finances: m(locale, "owner.navFinances"),
      statistics: m(locale, "owner.navStatistics"),
      help: m(locale, "owner.navHelp"),
      notifications: m(locale, "owner.navNotifications")
    }
  };

  const mobileLabels: OwnerMobileShellLabels = {
    items: labels.items,
    tabs: {
      home: m(locale, "owner.mobileTabHome"),
      properties: m(locale, "owner.mobileTabProperties"),
      bookings: m(locale, "owner.mobileTabBookings"),
      calendar: m(locale, "owner.mobileTabCalendar"),
      more: m(locale, "owner.mobileTabMore")
    },
    drawerTitle: m(locale, "roles.OWNER"),
    profile: m(locale, "userMenu.profile"),
    logout: m(locale, "userMenu.logout")
  };

  return (
    <DashboardShell sidebar={<OwnerSidebar labels={labels} />} mobileNav={null}>
      <OwnerMobileShell
        locale={locale}
        labels={mobileLabels}
        ownerName={fullName}
        ownerImage={owner.image ?? owner.telegramPhotoUrl}
        unreadNotifications={unreadNotifications}
      >
        {children}
      </OwnerMobileShell>
    </DashboardShell>
  );
}
