import type { ReactNode } from "react";
import { AdminMobileNav, AdminSidebar, type AdminSidebarLabels } from "@/components/dashboard/AdminSidebar";
import { DashboardShell } from "@/components/ds";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
  const labels: AdminSidebarLabels = {
    sectionTitle: m(locale, "admin.navAdmin"),
    navLabel: m(locale, "admin.mobileNav"),
    mobileNav: m(locale, "admin.mobileNav"),
    navHint: m(locale, "admin.navHint"),
    items: {
      dashboard: m(locale, "adminNav.dashboard"),
      content: m(locale, "adminNav.content"),
      applications: m(locale, "adminNav.applications"),
      hotels: m(locale, "adminNav.hotels"),
      users: m(locale, "adminNav.users"),
      ownerAccess: m(locale, "adminNav.ownerAccess"),
      bookings: m(locale, "adminNav.bookings"),
      finance: "Finance",
      complaints: m(locale, "adminNav.complaints"),
      notifications: m(locale, "adminNav.notifications")
    }
  };

  return (
    <DashboardShell sidebar={<AdminSidebar labels={labels} />} mobileNav={<AdminMobileNav labels={labels} />}>
      {children}
    </DashboardShell>
  );
}
