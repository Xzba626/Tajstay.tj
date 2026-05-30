import Link from "next/link";
import { ClipboardList, Heart, Luggage, Star } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
  favorites: number;
  bookings: number;
  reviews: number;
  trips: number;
};

type Stat = {
  href: string;
  icon: typeof Heart;
  label: string;
  value: number;
};

export function ProfileStatsGrid({ locale, favorites, bookings, reviews, trips }: Props) {
  const stats: Stat[] = [
    { href: "/favorites", icon: Heart, label: m(locale, "profile.statFavorites"), value: favorites },
    { href: "/dashboard/bookings", icon: ClipboardList, label: m(locale, "profile.statBookings"), value: bookings },
    { href: "/profile/personal#reviews", icon: Star, label: m(locale, "profile.statReviews"), value: reviews },
    { href: "/dashboard/bookings?tab=active", icon: Luggage, label: m(locale, "profile.statTrips"), value: trips }
  ];

  return (
    <div className="profile-stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link key={stat.href + stat.label} href={stat.href} className="profile-stats-grid__item">
            <Icon size={18} className="text-[var(--green-accent)]" aria-hidden />
            <span className="profile-stats-grid__value">{stat.value}</span>
            <span className="profile-stats-grid__label">{stat.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
