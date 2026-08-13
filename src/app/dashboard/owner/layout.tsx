import type { ReactNode } from "react";
import { OwnerMobileNav, OwnerSidebar, type OwnerSidebarLabels } from "@/components/dashboard/OwnerSidebar";
import { DashboardShell } from "@/components/ds";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default function OwnerDashboardLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
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

  return (
    <DashboardShell sidebar={<OwnerSidebar labels={labels} />} mobileNav={<OwnerMobileNav labels={labels} />}>
      {children}
    </DashboardShell>
  );
}
