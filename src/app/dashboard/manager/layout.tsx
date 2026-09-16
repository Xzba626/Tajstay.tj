import type { ReactNode } from "react";
import { DashboardShell } from "@/components/ds";
import { ManagerBottomNav } from "@/components/manager/ManagerBottomNav";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { requireManager, listActiveStaffHotels } from "@/lib/staff/hotelAccess";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const MANAGER_HOTEL_COOKIE = "tajstay_manager_hotel";

export default async function ManagerDashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireManager();
  const locale = getLocale();
  const memberships = await listActiveStaffHotels(user.id);
  if (!memberships.length) {
    // INVITED-only: still allow profile/password; otherwise empty.
    const { prisma } = await import("@/lib/prisma");
    const invited = await prisma.hotelStaff.findMany({
      where: { userId: user.id, status: { in: ["INVITED", "ACTIVE"] } },
      include: { hotel: { select: { id: true, name: true, city: true, status: true } } }
    });
    if (!invited.length) redirect("/history?notice=managerOnly");
  }

  const hotels = memberships.length
    ? memberships.map((x) => x.hotel)
    : (
        await (await import("@/lib/prisma")).prisma.hotelStaff.findMany({
          where: { userId: user.id, status: "INVITED" },
          include: { hotel: { select: { id: true, name: true, city: true, status: true } } }
        })
      ).map((x) => x.hotel);

  const cookieHotel = Number((await cookies()).get(MANAGER_HOTEL_COOKIE)?.value || "") || 0;
  const activeHotel =
    hotels.find((h) => h.id === cookieHotel) ?? hotels[0] ?? { id: 0, name: "—", city: "", status: "" };

  return (
    <>
      <ManagerHeader
        brandLabel={m(locale, "manager.brand")}
        hotelName={activeHotel.name}
      />
      <DashboardShell
        className="manager-workspace-shell ts-workspace-light"
        sidebar={null}
        mobileNav={
          <ManagerBottomNav
            labels={{
              ariaLabel: m(locale, "manager.navAria"),
              newBooking: m(locale, "manager.navNew"),
              bookings: m(locale, "manager.navBookings"),
              today: m(locale, "manager.navToday"),
              profile: m(locale, "manager.navProfile")
            }}
          />
        }
      >
        {children}
      </DashboardShell>
    </>
  );
}
