import type { ReactNode } from "react";
import { AdminMobileNav, AdminSidebar, type AdminSidebarLabels } from "@/components/dashboard/AdminSidebar";
import { DashboardShell } from "@/components/ds";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminUnreadNotificationsCount } from "@/lib/notifications/unread";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const locale = getLocale();
  // Same 7-day admin-operational-only window used by the Dashboard's own notifications KPI
  // (src/app/dashboard/admin/page.tsx) — both now share this one type-scoped query.
  const unreadCount = await getAdminUnreadNotificationsCount(admin.id);
  const labels: AdminSidebarLabels = {
    sectionTitle: m(locale, "admin.navAdmin"),
    navLabel: m(locale, "admin.mobileNav"),
    mobileNav: m(locale, "admin.mobileNav"),
    navHint: m(locale, "admin.navHint"),
    mobileMore: m(locale, "admin.mobileMore"),
    drawerGroupSecondary: m(locale, "admin.drawerGroupSecondary"),
    drawerGroups: {
      hotels: m(locale, "admin.drawerGroupHotels"),
      platform: m(locale, "admin.drawerGroupPlatform"),
      finance: m(locale, "admin.drawerGroupFinance"),
      operations: m(locale, "admin.drawerGroupOperations"),
      access: m(locale, "admin.drawerGroupAccess")
    },
    sidebarGroups: {
      overview: m(locale, "admin.sidebarGroupOverview"),
      people: m(locale, "admin.sidebarGroupPeople"),
      hotelOps: m(locale, "admin.sidebarGroupHotelOps"),
      platform: m(locale, "admin.sidebarGroupPlatform"),
      finance: m(locale, "admin.sidebarGroupFinance"),
      operations: m(locale, "admin.sidebarGroupOperations")
    },
    items: {
      dashboard: m(locale, "adminNav.dashboard"),
      content: m(locale, "adminNav.content"),
      applications: m(locale, "adminNav.applications"),
      hotels: m(locale, "adminNav.hotels"),
      users: m(locale, "adminNav.users"),
      ownerAccess: m(locale, "adminNav.ownerAccess"),
      bookings: m(locale, "adminNav.bookings"),
      finance: m(locale, "adminNav.finance"),
      complaints: m(locale, "adminNav.complaints"),
      notifications: m(locale, "adminNav.notifications")
    },
    mobileShort: {
      dashboard: m(locale, "adminNav.dashboardShort"),
      applications: m(locale, "adminNav.applicationsShort"),
      users: m(locale, "adminNav.usersShort"),
      hotels: m(locale, "adminNav.hotelsShort")
    }
  };

  return (
    <>
      <AdminHeader
        locale={locale}
        brandPrimary={m(locale, "admin.headerBrandShort")}
        brandFull={m(locale, "admin.headerBrand")}
        adminName={admin.name || admin.phone}
        adminRoleLabel={m(locale, "roles.ADMIN")}
        unreadCount={unreadCount}
        notificationsHref="/dashboard/admin?section=notifications"
        notificationsAria={m(locale, "admin.headerNotificationsAria")}
        profileLabels={{
          profileAria: m(locale, "admin.headerProfileAria"),
          accountSecurity: m(locale, "admin.headerAccountSecurity"),
          logout: m(locale, "admin.headerLogout"),
          loggingOut: m(locale, "admin.headerLoggingOut"),
          logoutConfirmTitle: m(locale, "admin.headerLogoutConfirmTitle"),
          logoutConfirmBody: m(locale, "admin.headerLogoutConfirmBody"),
          logoutConfirmAction: m(locale, "admin.headerLogoutConfirmAction"),
          logoutCancel: m(locale, "admin.headerLogoutCancel")
        }}
      />
      <DashboardShell
        className="admin-command-center-shell ts-workspace-light"
        sidebar={<AdminSidebar labels={labels} />}
        mobileNav={<AdminMobileNav labels={labels} />}
      >
        {children}
      </DashboardShell>
    </>
  );
}
