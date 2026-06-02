"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerDashboardKpis } from "@/lib/services/ownerDashboardKpis";

type Props = {
  locale: Locale;
  kpis: OwnerDashboardKpis;
  pendingOnlineBookings: number;
};

export function OwnerMobileDashboard({ locale, kpis, pendingOnlineBookings }: Props) {
  const router = useRouter();

  const statCards = [
    {
      icon: "📅",
      value: String(kpis.bookingsToday),
      label: m(locale, "owner.mobileStatBookingsToday"),
      sub: m(locale, "owner.mobileStatCheckIns", { count: kpis.checkInsToday })
    },
    {
      icon: "🚪",
      value: String(kpis.checkOutsToday),
      label: m(locale, "owner.mobileStatCheckOuts"),
      sub: m(locale, "owner.mobileStatActiveHotels", { count: kpis.activeHotels })
    },
    {
      icon: "💰",
      value: `${kpis.revenueMonth.toLocaleString()} TJS`,
      label: m(locale, "owner.mobileStatRevenue"),
      sub: m(locale, "owner.mobileStatPendingHotels", { count: kpis.hotelsPendingModeration })
    },
    {
      icon: "💬",
      value: String(kpis.unreadMessages),
      label: m(locale, "owner.mobileStatMessages"),
      sub: m(locale, "owner.mobileStatPendingBookings", { count: pendingOnlineBookings })
    }
  ];

  const quickActions = [
    {
      href: "/dashboard/owner?section=offline-bookings",
      label: m(locale, "owner.quick.offlineBooking"),
      count: 0
    },
    {
      href: "/dashboard/owner?section=calendar",
      label: m(locale, "owner.quick.calendar"),
      count: 0
    },
    {
      href: "/dashboard/messages",
      label: m(locale, "owner.quick.messages"),
      count: kpis.unreadMessages
    },
    {
      href: "/dashboard/owner?section=bookings",
      label: m(locale, "owner.navBookings"),
      count: pendingOnlineBookings
    }
  ];

  return (
    <div className="admin-mobile-dashboard lg:hidden">
      <div className="admin-mobile-stats-grid">
        {statCards.map((card) => (
          <article key={card.label} className="admin-mobile-stat-card">
            <span className="admin-mobile-stat-card__icon" aria-hidden>
              {card.icon}
            </span>
            <div className="admin-mobile-stat-card__value">{card.value}</div>
            <div className="admin-mobile-stat-card__label">{card.label}</div>
            <div className="admin-mobile-stat-card__sub">{card.sub}</div>
          </article>
        ))}
      </div>

      <div className="admin-mobile-quick-actions" role="list">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-mobile-quick-actions__pill" role="listitem">
            <span>{action.label}</span>
            {action.count > 0 ? <span className="admin-mobile-quick-actions__badge">{action.count}</span> : null}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="admin-mobile-quick-actions__pill"
          onClick={() => router.refresh()}
        >
          ↻ {m(locale, "pwa.offlineRetry")}
        </button>
      </div>
    </div>
  );
}
