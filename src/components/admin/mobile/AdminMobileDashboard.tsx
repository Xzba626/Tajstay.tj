"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";

export type AdminMobileDashboardStats = {
  hotelTotal: number;
  hotelApproved: number;
  hotelsToday: number;
  userTotal: number;
  usersToday: number;
  bookingTotal: number;
  activeBookings: number;
  newBookings: number;
  revenue30: number;
  revenueGrowthPercent: number;
};

export type AdminMobileQuickAction = {
  section: string;
  label: string;
  count: number;
};

export type AdminMobileActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  at: Date;
};

type Props = {
  locale: Locale;
  stats: AdminMobileDashboardStats;
  quickActions: AdminMobileQuickAction[];
  activity: AdminMobileActivityItem[];
};

export function AdminMobileDashboard({ locale, stats, quickActions, activity }: Props) {
  const router = useRouter();

  const statCards = [
    {
      icon: "📦",
      value: String(stats.hotelTotal),
      label: m(locale, "admin.hotelsTotal"),
      sub: m(locale, "admin.mobileStatHotelsToday", { count: stats.hotelsToday })
    },
    {
      icon: "👥",
      value: String(stats.userTotal),
      label: m(locale, "admin.users"),
      sub: m(locale, "admin.mobileStatUsersToday", { count: stats.usersToday })
    },
    {
      icon: "📅",
      value: `${stats.activeBookings} ${m(locale, "admin.mobileActiveBookings")}`,
      label: m(locale, "admin.bookingsTotal"),
      sub: m(locale, "admin.mobileStatBookingsNew", { count: stats.newBookings })
    },
    {
      icon: "💰",
      value: `${stats.revenue30.toLocaleString(locale === "en" ? "en-US" : "ru-RU")} TJS`,
      label: m(locale, "admin.revenue30"),
      sub: m(locale, "admin.mobileStatRevenueMonth", { percent: stats.revenueGrowthPercent })
    }
  ];

  const refresh = () => router.refresh();

  return (
    <div className="admin-mobile-dashboard lg:hidden">
      <div
        className="admin-mobile-dashboard__pull-hint"
        onTouchEnd={(e) => {
          const touch = e.changedTouches[0];
          if (touch && touch.clientY > 120) return;
          refresh();
        }}
      />

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
          <Link
            key={action.section}
            href={`/dashboard/admin?section=${action.section}`}
            className="admin-mobile-quick-actions__pill"
            role="listitem"
          >
            <span>{action.label}</span>
            {action.count > 0 ? (
              <span className="admin-mobile-quick-actions__badge">{action.count}</span>
            ) : null}
          </Link>
        ))}
      </div>

      <section className="admin-mobile-activity">
        <h2 className="admin-mobile-activity__title">{m(locale, "admin.mobileActivityTitle")}</h2>
        {activity.length === 0 ? (
          <p className="admin-mobile-activity__empty">{m(locale, "admin.mobileActivityEmpty")}</p>
        ) : (
          <ul className="admin-mobile-activity__list">
            {activity.map((item) => (
              <li key={item.id} className="admin-mobile-activity__item">
                <div className="admin-mobile-activity__avatar" aria-hidden>
                  {item.title.charAt(0).toUpperCase()}
                </div>
                <div className="admin-mobile-activity__body">
                  <div className="admin-mobile-activity__text">{item.title}</div>
                  <div className="admin-mobile-activity__meta">
                    {item.subtitle} · {formatDateTimeShort(locale, item.at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
