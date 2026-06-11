import type { ReactNode } from "react";
import { AdminSidebar, type AdminSidebarLabels } from "@/components/dashboard/AdminSidebar";
import { DashboardShell } from "@/components/ds";
import { AdminMobileShell, type AdminMobileShellLabels } from "@/components/admin/mobile/AdminMobileShell";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";
import { resolveUserNames } from "@/lib/profile/userName";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { getSiteContent } from "@/lib/site-content";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
  const content = await getSiteContent();
  const admin = await requireAdmin();
  const { fullName } = resolveUserNames(admin);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [pendingHotels, pendingApplications, pendingComplaints, unreadNotifications] = await Promise.all([
    prisma.hotel.count({ where: { status: "PENDING" } }),
    prisma.ownerApplication.count({ where: { status: OWNER_APPLICATION_STATUS.PENDING } }),
    prisma.complaint.count({ where: { status: "PENDING" } }),
    getUnreadNotificationsCount(admin.id)
  ]);

  const labels: AdminSidebarLabels = {
    sectionTitle: m(locale, "admin.navAdmin"),
    navLabel: m(locale, "admin.mobileNav"),
    mobileNav: m(locale, "admin.mobileNav"),
    navHint: m(locale, "admin.navHint"),
    items: {
      dashboard: m(locale, "adminNav.dashboard"),
      content: m(locale, "adminNav.content"),
      propertyTypes: m(locale, "adminNav.propertyTypes"),
      applications: m(locale, "adminNav.applications"),
      hotels: m(locale, "adminNav.hotels"),
      users: m(locale, "adminNav.users"),
      ownerAccess: m(locale, "adminNav.ownerAccess"),
      bookings: m(locale, "adminNav.bookings"),
      finance: m(locale, "adminNav.finance"),
      complaints: m(locale, "adminNav.complaints"),
      notifications: m(locale, "adminNav.notifications")
    }
  };

  const mobileLabels: AdminMobileShellLabels = {
    items: labels.items,
    tabs: {
      home: m(locale, "admin.mobileTabHome"),
      properties: m(locale, "admin.mobileTabProperties"),
      bookings: m(locale, "admin.mobileTabBookings"),
      users: m(locale, "admin.mobileTabUsers"),
      menu: m(locale, "admin.mobileTabMenu")
    },
    drawerTitle: m(locale, "admin.navAdmin"),
    profile: m(locale, "userMenu.profile"),
    logout: m(locale, "userMenu.logout")
  };

  return (
    <DashboardShell sidebar={<AdminSidebar labels={labels} />} mobileNav={null}>
      <AdminMobileShell
        locale={locale}
        labels={mobileLabels}
        brandName={content.brand.siteName}
        brandMarkUrl={content.brand.logoMarkUrl}
        adminName={fullName}
        adminImage={admin.image ?? admin.telegramPhotoUrl}
        badgeCounts={{
          pendingHotels,
          pendingApplications,
          pendingComplaints,
          unreadNotifications
        }}
      >
        {children}
      </AdminMobileShell>
    </DashboardShell>
  );
}
