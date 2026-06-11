import type { ReactNode } from "react";
import { DashboardShell } from "@/components/ds";
import { ModeratorSidebar, ModeratorMobileNav, type ModeratorSidebarLabels } from "@/components/dashboard/ModeratorSidebar";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { requireModerator } from "@/lib/auth/requireModerator";
import { resolveUserNames } from "@/lib/profile/userName";
import { getSiteContent } from "@/lib/site-content";

export default async function ModeratorDashboardLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
  const content = await getSiteContent();
  const moderator = await requireModerator();
  const { fullName } = resolveUserNames(moderator);

  const labels: ModeratorSidebarLabels = {
    sectionTitle: m(locale, "roles.HOTEL_MODERATOR"),
    navLabel: m(locale, "moderator.navLabel"),
    mobileNav: m(locale, "moderator.mobileNav"),
    items: {
      bookings: m(locale, "moderator.navBookings"),
      calendar: m(locale, "moderator.navCalendar"),
      offlineBookings: m(locale, "moderator.navOfflineBookings"),
      rooms: m(locale, "moderator.navRooms"),
      guests: m(locale, "moderator.navGuests")
    }
  };

  return (
    <DashboardShell sidebar={<ModeratorSidebar labels={labels} />} mobileNav={null}>
      <div className="px-4 pb-10 lg:px-0">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
              {m(locale, "moderator.panelTitle")}
            </p>
            <h1 className="mt-1 text-xl font-bold text-white">{fullName}</h1>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            {content.brand.siteName}
          </span>
        </header>
        <ModeratorMobileNav labels={labels} />
        {children}
      </div>
    </DashboardShell>
  );
}
