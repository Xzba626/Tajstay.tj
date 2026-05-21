import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerDashboardKpis as Kpis } from "@/lib/services/ownerDashboardKpis";
import { ContentGrid, StatCard } from "@/components/ds";

export function OwnerDashboardKpis({ locale, kpis }: { locale: Locale; kpis: Kpis }) {
  const items = [
    { label: m(locale, "owner.kpi.activeHotels"), value: kpis.activeHotels },
    { label: m(locale, "owner.kpi.pendingOnline"), value: kpis.pendingOnlineBookings },
    { label: m(locale, "owner.kpi.bookingsToday"), value: kpis.bookingsToday },
    { label: m(locale, "owner.kpi.checkInsToday"), value: kpis.checkInsToday },
    { label: m(locale, "owner.kpi.checkOutsToday"), value: kpis.checkOutsToday },
    { label: m(locale, "owner.kpi.revenueMonth"), value: `${kpis.revenueMonth} TJS` },
    { label: m(locale, "owner.kpi.unreadMessages"), value: kpis.unreadMessages },
    { label: m(locale, "owner.kpi.hotelsModeration"), value: kpis.hotelsPendingModeration }
  ];

  return (
    <ContentGrid cols={4} gap="md">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </ContentGrid>
  );
}
