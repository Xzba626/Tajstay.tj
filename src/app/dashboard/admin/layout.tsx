import type { ReactNode } from "react";
import { AdminMobileNav, AdminSidebar, type AdminSidebarLabels } from "@/components/dashboard/AdminSidebar";
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
    <div className="min-h-[calc(100vh-4rem)] bg-brand-900">
      <div className="mx-auto flex max-w-[1600px]">
        <AdminSidebar labels={labels} />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10" data-reveal data-stagger="60">
          <AdminMobileNav labels={labels} />
          {children}
        </div>
      </div>
    </div>
  );
}
