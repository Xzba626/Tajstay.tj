"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/cn";

export type MobileBottomNavLabels = {
  ariaLabel: string;
  home: string;
  search: string;
  favorites: string;
  bookings: string;
  profile: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
};

const HIDDEN_PREFIXES = ["/auth", "/dashboard/admin", "/dashboard/owner"];

function shouldHide(pathname: string) {
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MobileBottomNav({ labels }: { labels: MobileBottomNavLabels }) {
  const pathname = usePathname() ?? "/";

  if (shouldHide(pathname)) return null;

  const items: NavItem[] = [
    {
      href: "/",
      label: labels.home,
      icon: Home,
      isActive: (p) => p === "/"
    },
    {
      href: "/search",
      label: labels.search,
      icon: Search,
      isActive: (p) => p.startsWith("/search")
    },
    {
      href: "/favorites",
      label: labels.favorites,
      icon: Heart,
      isActive: (p) => p.startsWith("/favorites")
    },
    {
      href: "/dashboard/bookings",
      label: labels.bookings,
      icon: ClipboardList,
      isActive: (p) =>
        p.startsWith("/dashboard/bookings") ||
        p.startsWith("/dashboard/guest") ||
        p.startsWith("/booking") ||
        p.startsWith("/chat/booking")
    },
    {
      href: "/profile",
      label: labels.profile,
      icon: User,
      isActive: (p) => p.startsWith("/profile")
    }
  ];

  return (
    <nav
      className="mobile-bottom-nav md:hidden"
      aria-label={labels.ariaLabel}
    >
      <div className="mobile-bottom-nav__inner">
        {items.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn("mobile-bottom-nav__item", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="mobile-bottom-nav__icon" size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="mobile-bottom-nav__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
