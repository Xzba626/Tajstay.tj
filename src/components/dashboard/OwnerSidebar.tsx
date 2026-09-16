"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ScrollText,
  Star,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/cn";
import { WorkspaceMobileDrawer } from "@/components/navigation/WorkspaceMobileDrawer";
import { BodyPortal } from "@/components/navigation/BodyPortal";
import { subscribeWorkspaceDrawerOpen } from "@/lib/workspace/workspace-nav-bridge";

export type OwnerSwitcherHotel = { id: number; name: string; city: string; status: string };

export type OwnerSidebarLabels = {
  sectionTitle: string;
  navLabel: string;
  mobileNav: string;
  navHint?: string;
  mobileMore: string;
  drawerGroupSecondary?: string;
  drawerGroups?: {
    operations: string;
    insights: string;
    support: string;
  };
  sidebarGroups?: {
    overview: string;
    properties: string;
    operations: string;
    insights: string;
    support: string;
  };
  items: {
    overview: string;
    properties: string;
    rooms: string;
    bookings: string;
    offlineBookings: string;
    calendar: string;
    messages: string;
    reviews: string;
    finances: string;
    statistics: string;
    activity: string;
    help: string;
    notifications: string;
  };
  mobileShort?: {
    overview: string;
    properties: string;
    bookings: string;
    calendar: string;
  };
  switchProperty: string;
  allProperties: string;
  pendingSuffix: string;
  rejectedSuffix: string;
};

type SidebarItem = {
  section?: string;
  href?: string;
  label: string;
  Icon: typeof LayoutDashboard;
};

function buildItems(labels: OwnerSidebarLabels): SidebarItem[] {
  return [
    { section: "overview", label: labels.items.overview, Icon: LayoutDashboard },
    { section: "properties", label: labels.items.properties, Icon: Building2 },
    { section: "rooms", label: labels.items.rooms, Icon: BedDouble },
    { section: "bookings", label: labels.items.bookings, Icon: Wallet },
    { section: "offline-bookings", label: labels.items.offlineBookings, Icon: Wallet },
    { section: "calendar", label: labels.items.calendar, Icon: CalendarDays },
    { href: "/dashboard/messages", label: labels.items.messages, Icon: MessageSquare },
    { section: "reviews", label: labels.items.reviews, Icon: Star },
    { section: "finances", label: labels.items.finances, Icon: CreditCard },
    { section: "analytics", label: labels.items.statistics, Icon: BarChart3 },
    { section: "activity", label: labels.items.activity, Icon: ScrollText },
    { section: "help", label: labels.items.help, Icon: CircleHelp },
    { section: "notifications", label: labels.items.notifications, Icon: Bell }
  ];
}

const MOBILE_PRIMARY = ["overview", "properties", "bookings", "calendar"] as const;

const OWNER_DRAWER_GROUPS = [
  { key: "operations" as const, sections: ["rooms", "offline-bookings"] },
  { key: "insights" as const, sections: ["finances", "analytics", "reviews", "notifications", "activity"] },
  { key: "support" as const, hrefs: ["/dashboard/messages"], sections: ["help"] as string[] }
];

const OWNER_SIDEBAR_GROUPS = [
  { key: "overview" as const, sections: ["overview"] },
  { key: "properties" as const, sections: ["properties", "rooms"] },
  { key: "operations" as const, sections: ["bookings", "offline-bookings", "calendar"] },
  { key: "insights" as const, sections: ["finances", "analytics", "reviews", "notifications", "activity"] },
  { key: "support" as const, sections: ["help"], hrefs: ["/dashboard/messages"] as string[] }
];

function resolveHref(pathname: string, item: SidebarItem, hotelId?: string | null): string {
  if (item.href) return item.href;
  const suffix = hotelId ? `&hotelId=${hotelId}` : "";
  return `${pathname}?section=${item.section ?? "overview"}${suffix}`;
}

function isActive(pathname: string, section: string, item: SidebarItem): boolean {
  if (item.href) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return section === (item.section ?? "overview");
}

export function PropertySwitcher({
  hotels,
  labels,
  className,
  variant = "sidebar"
}: {
  hotels: OwnerSwitcherHotel[];
  labels: OwnerSidebarLabels;
  className?: string;
  variant?: "sidebar" | "header" | "drawer";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const activeHotelId = Number(search.get("hotelId") ?? "") || 0;
  const firstApprovedId = hotels.find((h) => h.status === "APPROVED")?.id ?? hotels[0]?.id ?? 0;
  const currentId = activeHotelId || firstApprovedId;
  const current = hotels.find((h) => h.id === currentId) ?? hotels[0];
  const listboxId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Sync UX preference cookie from URL (server cannot write cookies in RSC).
  useEffect(() => {
    if (!activeHotelId) return;
    try {
      document.cookie = `tajstay_owner_hotel=${encodeURIComponent(String(activeHotelId))}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
    } catch {
      /* ignore */
    }
  }, [activeHotelId]);

  if (!hotels.length || !current) return null;

  function goToHotel(nextId: number) {
    if (!hotels.some((h) => h.id === nextId && h.status === "APPROVED")) return;
    const params = new URLSearchParams(search.toString());
    params.set("hotelId", String(nextId));
    params.delete("page");
    // UX preference cookie — AuthZ still re-validates ownership on the server.
    try {
      document.cookie = `tajstay_owner_hotel=${encodeURIComponent(String(nextId))}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
    } catch {
      /* ignore */
    }
    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  const statusSuffix =
    current.status === "PENDING"
      ? labels.pendingSuffix
      : current.status === "REJECTED"
        ? labels.rejectedSuffix
        : null;

  // Single hotel: identity chip only.
  if (hotels.length === 1) {
    return (
      <div
        className={cn(
          "owner-sidebar__switcher owner-sidebar__switcher--single",
          variant === "header" && "owner-sidebar__switcher--header",
          className
        )}
      >
        {variant !== "header" ? <p className="owner-sidebar__switcher-label">{labels.switchProperty}</p> : null}
        <p className="owner-sidebar__switcher-current" data-testid="owner-property-switcher">
          {current.name}
          {variant !== "header" && current.city ? (
            <span className="owner-sidebar__switcher-city"> · {current.city}</span>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "owner-sidebar__switcher owner-sidebar__switcher--listbox",
        variant === "header" && "owner-sidebar__switcher--header",
        className
      )}
    >
      {variant !== "header" ? (
        <p className="owner-sidebar__switcher-label" id={`${listboxId}-label`}>
          {labels.switchProperty}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="owner-property-switcher"
        className="owner-sidebar__switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={variant !== "header" ? `${listboxId}-label` : undefined}
        aria-label={variant === "header" ? labels.switchProperty : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="owner-sidebar__switcher-trigger-text">
          {current.name}
          {statusSuffix ? <span className="owner-sidebar__switcher-city"> · {statusSuffix}</span> : null}
        </span>
        <span className="owner-sidebar__switcher-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="owner-sidebar__switcher-backdrop"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <ul className="owner-sidebar__switcher-listbox" role="listbox" aria-labelledby={`${listboxId}-label`}>
            {hotels.map((h) => {
              const isApproved = h.status === "APPROVED";
              const selected = h.id === currentId;
              const suffix =
                h.status === "PENDING"
                  ? labels.pendingSuffix
                  : h.status === "REJECTED"
                    ? labels.rejectedSuffix
                    : null;
              return (
                <li key={h.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={!isApproved}
                    className={cn("owner-sidebar__switcher-option", selected && "is-selected")}
                    onClick={() => goToHotel(h.id)}
                  >
                    <span className="owner-sidebar__switcher-option-name">{h.name}</span>
                    <span className="owner-sidebar__switcher-option-meta">
                      {h.city}
                      {suffix ? ` · ${suffix}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function OwnerSidebar({ labels, hotels }: { labels: OwnerSidebarLabels; hotels: OwnerSwitcherHotel[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "overview";
  const hotelId = search.get("hotelId");
  const items = buildItems(labels);
  const itemsBySection = new Map(items.filter((i) => i.section).map((item) => [item.section!, item]));

  return (
    <aside className="owner-sidebar" aria-label={labels.navLabel}>
      <p className="owner-sidebar__title">{labels.sectionTitle}</p>
      <PropertySwitcher hotels={hotels} labels={labels} />
      <nav className="owner-sidebar__nav">
        {OWNER_SIDEBAR_GROUPS.map((group) => {
          const groupItems = [
            ...group.sections.map((s) => itemsBySection.get(s)).filter(Boolean),
            ...(group.hrefs?.map((href) => items.find((i) => i.href === href)).filter(Boolean) ?? [])
          ] as SidebarItem[];
          if (groupItems.length === 0) return null;

          return (
            <div key={group.key} className="owner-sidebar__group">
              {labels.sidebarGroups ? (
                <p className="owner-sidebar__group-label">{labels.sidebarGroups[group.key]}</p>
              ) : null}
              {groupItems.map((item) => {
                const active = isActive(pathname, section, item);
                const href = resolveHref(pathname, item, hotelId);
                return (
                  <Link
                    key={href + item.label}
                    href={href}
                    scroll={!item.href}
                    className={cn("owner-sidebar__link", active && "is-active")}
                  >
                    <span className="owner-sidebar__link-icon">
                      <item.Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function OwnerMobileNav({ labels, hotels }: { labels: OwnerSidebarLabels; hotels: OwnerSwitcherHotel[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const section = search.get("section") ?? "overview";
  const hotelId = search.get("hotelId");
  const items = buildItems(labels);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => subscribeWorkspaceDrawerOpen("owner", () => setMoreOpen(true)), []);

  const primaryItems = items.filter((item) =>
    item.section ? MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number]) : false
  );
  const moreItems = items.filter(
    (item) => !item.section || !MOBILE_PRIMARY.includes(item.section as (typeof MOBILE_PRIMARY)[number])
  );
  const moreActive = moreItems.some((item) => isActive(pathname, section, item));
  const moreBySection = new Map(moreItems.filter((i) => i.section).map((item) => [item.section!, item]));
  const moreByHref = new Map(moreItems.filter((i) => i.href).map((item) => [item.href!, item]));

  return (
    <>
      <BodyPortal>
      <nav className="workspace-mobile-bottom-nav owner-mobile-bottom-nav lg:hidden" aria-label={labels.mobileNav}>
        {primaryItems.map((item) => {
          const active = isActive(pathname, section, item);
          const href = resolveHref(pathname, item, hotelId);
          const shortLabel =
            labels.mobileShort?.[item.section as keyof NonNullable<OwnerSidebarLabels["mobileShort"]>] ?? item.label;
          return (
            <Link
              key={href}
              href={href}
              className={cn("workspace-mobile-bottom-nav__link owner-mobile-bottom-nav__link", active && "is-active")}
            >
              <item.Icon className="workspace-mobile-bottom-nav__icon owner-mobile-bottom-nav__icon" aria-hidden />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={cn(
            "workspace-mobile-bottom-nav__link owner-mobile-bottom-nav__link",
            (moreOpen || moreActive) && "is-active"
          )}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <Menu className="workspace-mobile-bottom-nav__icon owner-mobile-bottom-nav__icon" aria-hidden />
          <span>{labels.mobileMore}</span>
        </button>
      </nav>
      </BodyPortal>

      <WorkspaceMobileDrawer
        open={moreOpen}
        title={labels.mobileMore}
        ariaLabel={labels.mobileMore}
        onClose={() => setMoreOpen(false)}
      >
        <PropertySwitcher
          hotels={hotels}
          labels={labels}
          variant="drawer"
          className="owner-sidebar__switcher--mobile"
        />
        {labels.drawerGroups
          ? OWNER_DRAWER_GROUPS.map((group) => {
              const groupItems = [
                ...group.sections.map((s) => moreBySection.get(s)).filter(Boolean),
                ...(group.hrefs?.map((h) => moreByHref.get(h)).filter(Boolean) ?? [])
              ] as SidebarItem[];
              if (groupItems.length === 0) return null;

              return (
                <div key={group.key} className="workspace-mobile-drawer__group">
                  <p className="workspace-mobile-drawer__group-title">{labels.drawerGroups![group.key]}</p>
                  {groupItems.map((item) => {
                    const active = isActive(pathname, section, item);
                    const href = resolveHref(pathname, item, hotelId);
                    return (
                      <Link
                        key={href + item.label}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        className={cn("workspace-mobile-drawer__link", active && "is-active")}
                      >
                        <span className="workspace-mobile-drawer__link-icon">
                          <item.Icon size={18} aria-hidden />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })
          : (
        <div className="workspace-mobile-drawer__group">
          <p className="workspace-mobile-drawer__group-title">
            {labels.drawerGroupSecondary ?? labels.navHint ?? labels.mobileMore}
          </p>
          {moreItems.map((item) => {
            const active = isActive(pathname, section, item);
            const href = resolveHref(pathname, item, hotelId);
            return (
              <Link
                key={href + item.label}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn("workspace-mobile-drawer__link", active && "is-active")}
              >
                <span className="workspace-mobile-drawer__link-icon">
                  <item.Icon size={18} aria-hidden />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
          )}
      </WorkspaceMobileDrawer>
    </>
  );
}
