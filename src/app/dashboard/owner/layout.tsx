import type { ReactNode } from "react";
import { OwnerMobileNav, OwnerSidebar, type OwnerSidebarLabels } from "@/components/dashboard/OwnerSidebar";
import { DashboardShell } from "@/components/ds";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { requireOwner } from "@/lib/auth/requireOwner";
import { prisma } from "@/lib/prisma";

export default async function OwnerDashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireOwner();
  const locale = getLocale();
  const hotels = await prisma.hotel.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, city: true, status: true }
  });
  const labels: OwnerSidebarLabels = {
    sectionTitle: m(locale, "roles.OWNER"),
    navLabel: m(locale, "owner.mobileNav"),
    mobileNav: m(locale, "owner.mobileNav"),
    navHint: m(locale, "owner.navHint"),
    mobileMore: m(locale, "owner.mobileMore"),
    drawerGroupSecondary: m(locale, "owner.drawerGroupSecondary"),
    drawerGroups: {
      operations: m(locale, "owner.drawerGroupOperations"),
      insights: m(locale, "owner.drawerGroupInsights"),
      support: m(locale, "owner.drawerGroupSupport")
    },
    sidebarGroups: {
      overview: m(locale, "owner.sidebarGroupOverview"),
      properties: m(locale, "owner.sidebarGroupProperties"),
      operations: m(locale, "owner.sidebarGroupOperations"),
      insights: m(locale, "owner.sidebarGroupInsights"),
      support: m(locale, "owner.sidebarGroupSupport")
    },
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
    },
    mobileShort: {
      overview: m(locale, "owner.navOverviewShort"),
      properties: m(locale, "owner.navPropertiesShort"),
      bookings: m(locale, "owner.navBookingsShort"),
      finances: m(locale, "owner.navFinancesShort")
    },
    switchProperty: m(locale, "owner.switchProperty"),
    allProperties: m(locale, "owner.allProperties"),
    pendingSuffix: m(locale, "owner.pendingSuffix"),
    rejectedSuffix: m(locale, "owner.rejectedSuffix")
  };

  return (
    <DashboardShell
      className="owner-command-center-shell ts-workspace-light"
      sidebar={<OwnerSidebar labels={labels} hotels={hotels} />}
      mobileNav={<OwnerMobileNav labels={labels} hotels={hotels} />}
    >
      {children}
    </DashboardShell>
  );
}
