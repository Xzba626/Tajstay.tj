import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerDashboardKpis as Kpis } from "@/lib/services/ownerDashboardKpis";

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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
