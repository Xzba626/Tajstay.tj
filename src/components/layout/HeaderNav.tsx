"use client";

import { usePathname } from "next/navigation";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; match?: (path: string) => boolean };

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match(pathname);
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="order-3 hidden w-full items-center justify-center gap-0.5 border-t border-white/8 py-2 md:order-none md:flex md:w-auto md:border-0 md:py-0"
      aria-label="Main"
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <ViewTransitionLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("header-nav-link min-h-[44px] inline-flex items-center", active && "is-active")}
          >
            {item.label}
          </ViewTransitionLink>
        );
      })}
    </nav>
  );
}
