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
  // Use the shared workspace-mobile-bottom-nav class so this picks up the
  // fixed-bottom-position + brand-green + dark-theme rules already defined in
  // src/styles/workspace-mobile-shell.css. Previously the component used the
  // unstyled `workspace-mobile-nav` class → rendered as an unpositioned inline
  // list stacked at the top of the empty content area on mobile. The extra
  // `manager-mobile-bottom-nav` class is used by the grid-template-columns
  // override below so 4 Manager items aren't stretched by the shared 5-column
  // grid intended for Owner/Admin.
  return (
    <nav
      className="workspace-mobile-bottom-nav manager-mobile-bottom-nav"
      aria-label={labels.ariaLabel}
    >
      <ul className="workspace-mobile-bottom-nav__list">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.Icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn("workspace-mobile-bottom-nav__link", active && "is-active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="workspace-mobile-bottom-nav__icon" aria-hidden />
                <span className="workspace-mobile-bottom-nav__label">{labels[item.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
