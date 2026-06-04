"use client";

import Link from "next/link";
import { CalendarDays, DoorOpen, MessageCircle, Wallet } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerDashboardKpis } from "@/lib/services/ownerDashboardKpis";
import type { LucideIcon } from "lucide-react";

type Props = {
  locale: Locale;
  kpis: OwnerDashboardKpis;
  pendingOnlineBookings: number;
};

export function OwnerMobileDashboard({ locale, kpis, pendingOnlineBookings }: Props) {
  const statCards: {
    icon: LucideIcon;
    value: string;
    label: string;
    sub: string;
  }[] = [
    {
      icon: CalendarDays,
      value: String(kpis.bookingsToday),
      label: m(locale, "owner.mobileStatBookingsToday"),
      sub: m(locale, "owner.mobileStatCheckIns", { count: kpis.checkInsToday })
    },
    {
      icon: DoorOpen,
      value: String(kpis.checkOutsToday),
      label: m(locale, "owner.mobileStatCheckOuts"),
      sub: m(locale, "owner.mobileStatActiveHotels", { count: kpis.activeHotels })
    },
    {
      icon: Wallet,
      value: `${kpis.revenueMonth.toLocaleString()} TJS`,
      label: m(locale, "owner.mobileStatRevenue"),
      sub: m(locale, "owner.mobileStatPendingHotels", { count: kpis.hotelsPendingModeration })
    },
    {
      icon: MessageCircle,
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
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="admin-mobile-stat-card">
              <span className="admin-mobile-stat-card__icon" aria-hidden>
                <Icon size={22} strokeWidth={1.75} />
              </span>
              <div className="admin-mobile-stat-card__value">{card.value}</div>
              <div className="admin-mobile-stat-card__label">{card.label}</div>
              <div className="admin-mobile-stat-card__sub">{card.sub}</div>
            </article>
          );
        })}
      </div>

      <div className="admin-mobile-quick-actions admin-mobile-quick-actions--scroll" role="list">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-mobile-quick-actions__pill" role="listitem">
            <span>{action.label}</span>
            {action.count > 0 ? <span className="admin-mobile-quick-actions__badge">{action.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
