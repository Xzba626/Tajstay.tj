"use client";

import { usePathname } from "next/navigation";
import { ViewTransitionLink } from "@/components/effects/ViewTransitionLink";

type NavItem = { href: string; label: string; match?: (path: string) => boolean };

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match(pathname);
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="order-3 hidden w-full items-center justify-center gap-1 border-t border-white/10 py-2 text-sm font-medium md:order-none md:flex md:w-auto md:border-0 md:py-0 lg:gap-2" aria-label="Main">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <ViewTransitionLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl px-3 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              active
                ? "bg-emerald-500/15 text-emerald-100 shadow-inner shadow-emerald-900/20"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </ViewTransitionLink>
        );
      })}
    </nav>
  );
}
