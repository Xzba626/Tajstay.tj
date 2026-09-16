"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, PlusCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

export type ManagerNavLabels = {
  newBooking: string;
  bookings: string;
  today: string;
  profile: string;
  ariaLabel: string;
};

const ITEMS = [
  { href: "/dashboard/manager/new", key: "newBooking" as const, Icon: PlusCircle },
  { href: "/dashboard/manager/bookings", key: "bookings" as const, Icon: ClipboardList },
  { href: "/dashboard/manager/today", key: "today" as const, Icon: CalendarDays },
  { href: "/dashboard/manager/profile", key: "profile" as const, Icon: UserRound }
];

export function ManagerBottomNav({ labels }: { labels: ManagerNavLabels }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="workspace-mobile-nav manager-mobile-nav" aria-label={labels.ariaLabel}>
      <ul className="workspace-mobile-nav__list">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.Icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn("workspace-mobile-nav__link", active && "is-active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="workspace-mobile-nav__icon" aria-hidden />
                <span className="workspace-mobile-nav__label">{labels[item.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
