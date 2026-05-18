import type { ReactNode } from "react";
import { OwnerMobileNav, OwnerSidebar, type OwnerSidebarLabels } from "@/components/dashboard/OwnerSidebar";
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
      calendar: m(locale, "owner.navCalendar"),
      notifications: m(locale, "owner.navNotifications")
    }
  };

  return (
    <div className="owner-panel min-h-[calc(100vh-4rem)] bg-brand-900 text-white">
      <div className="mx-auto flex max-w-[1600px]">
        <OwnerSidebar labels={labels} />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10" data-reveal data-stagger="60">
          <OwnerMobileNav labels={labels} />
          {children}
        </div>
      </div>
    </div>
  );
}
