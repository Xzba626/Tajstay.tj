"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/locale";
import { AdminMobileHeader } from "@/components/admin/mobile/AdminMobileHeader";
import { OwnerMobileBottomNav } from "@/components/owner/mobile/OwnerMobileBottomNav";
import { OwnerMobileDrawer } from "@/components/owner/mobile/OwnerMobileDrawer";
import { AdminMobileSubNav } from "@/components/admin/mobile/AdminMobileSubNav";
import {
  defaultSectionForOwnerTab,
  subNavForOwnerTab,
  tabForOwnerSection,
  type OwnerMobileTab
} from "@/components/owner/mobile/owner-mobile-nav";

const SECTION_TITLE_KEY: Record<string, string> = {
  overview: "overview",
  properties: "properties",
  rooms: "rooms",
  bookings: "bookings",
  "offline-bookings": "offlineBookings",
  calendar: "calendar",
  finances: "finances",
  statistics: "statistics",
  reviews: "reviews",
  notifications: "notifications",
  help: "help"
};

export type OwnerMobileShellLabels = {
  items: {
    overview: string;
    properties: string;
    rooms: string;
    bookings: string;
    offlineBookings: string;
    calendar: string;
    finances: string;
    statistics: string;
    reviews: string;
    notifications: string;
    help: string;
    messages: string;
  };
  tabs: {
    home: string;
    properties: string;
    bookings: string;
    calendar: string;
    menu: string;
  };
  drawerTitle: string;
  profile: string;
  logout: string;
};

type Props = {
  locale: Locale;
  labels: OwnerMobileShellLabels;
  brandName: string;
  brandMarkUrl: string;
  ownerName: string;
  ownerImage: string | null;
  unreadNotifications: number;
  children: ReactNode;
};

function OwnerMobileShellInner({
  locale,
  labels,
  brandName,
  brandMarkUrl,
  ownerName,
  ownerImage,
  unreadNotifications,
  children
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const section = search.get("section") ?? "overview";
  const activeTab = tabForOwnerSection(section);
  const subNav = subNavForOwnerTab(activeTab, labels.items);
  const titleKey = SECTION_TITLE_KEY[section] ?? "overview";
  const pageTitle = labels.items[titleKey as keyof typeof labels.items] ?? labels.items.overview;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      document.body.classList.toggle("owner-mobile-app", mq.matches);
      document.body.classList.toggle("panel-mobile-app", mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      document.body.classList.remove("owner-mobile-app", "panel-mobile-app");
      mq.removeEventListener("change", apply);
    };
  }, []);

  const navigateSection = (nextSection: string) => {
    const params = new URLSearchParams(search.toString());
    params.set("section", nextSection);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const navigateTab = (tab: OwnerMobileTab) => {
    if (tab === "menu") {
      setDrawerOpen(true);
      return;
    }
    setDrawerOpen(false);
    navigateSection(defaultSectionForOwnerTab(tab));
  };

  return (
    <div className="admin-mobile-layout owner-mobile-layout lg:contents">
      <AdminMobileHeader
        locale={locale}
        title={pageTitle}
        brandName={brandName}
        brandMarkUrl={brandMarkUrl}
        unreadCount={unreadNotifications}
        adminName={ownerName}
        adminImage={ownerImage}
      />

      {subNav.length > 1 ? (
        <AdminMobileSubNav
          items={subNav.map((s) => ({ section: s.section, label: s.label }))}
          activeSection={section}
          onSelect={navigateSection}
        />
      ) : null}

      <div className="admin-mobile-layout__body">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="admin-mobile-layout__page"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      <OwnerMobileBottomNav
        activeTab={activeTab}
        labels={labels.tabs}
        onTabChange={navigateTab}
        drawerOpen={drawerOpen}
      />

      <OwnerMobileDrawer
        locale={locale}
        labels={labels}
        ownerName={ownerName}
        ownerImage={ownerImage}
        activeSection={section}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigateSection}
      />
    </div>
  );
}

export function OwnerMobileShell(props: Props) {
  return (
    <Suspense fallback={<div className="owner-mobile-layout lg:contents">{props.children}</div>}>
      <OwnerMobileShellInner {...props} />
    </Suspense>
  );
}
