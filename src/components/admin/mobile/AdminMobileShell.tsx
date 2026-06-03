"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/locale";
import { AdminMobileHeader } from "@/components/admin/mobile/AdminMobileHeader";
import { AdminMobileBottomNav } from "@/components/admin/mobile/AdminMobileBottomNav";
import { AdminMobileDrawer } from "@/components/admin/mobile/AdminMobileDrawer";
import { AdminMobileSubNav } from "@/components/admin/mobile/AdminMobileSubNav";
import {
  defaultSectionForTab,
  subNavForTab,
  tabForSection,
  type AdminMobileTab
} from "@/components/admin/mobile/admin-mobile-nav";

const SECTION_TITLE_KEY: Record<string, keyof AdminMobileShellLabels["items"]> = {
  dashboard: "dashboard",
  content: "content",
  applications: "applications",
  hotels: "hotels",
  users: "users",
  "owner-access": "ownerAccess",
  bookings: "bookings",
  finance: "finance",
  complaints: "complaints",
  notifications: "notifications"
};

export type AdminMobileBadgeCounts = {
  pendingHotels: number;
  pendingApplications: number;
  pendingComplaints: number;
  unreadNotifications: number;
};

export type AdminMobileShellLabels = {
  items: {
    dashboard: string;
    content: string;
    applications: string;
    hotels: string;
    users: string;
    ownerAccess: string;
    bookings: string;
    finance: string;
    complaints: string;
    notifications: string;
  };
  tabs: {
    home: string;
    properties: string;
    bookings: string;
    users: string;
    menu: string;
  };
  drawerTitle: string;
  profile: string;
  logout: string;
};

type Props = {
  locale: Locale;
  labels: AdminMobileShellLabels;
  brandName: string;
  brandMarkUrl: string;
  adminName: string;
  adminImage: string | null;
  badgeCounts: AdminMobileBadgeCounts;
  children: ReactNode;
};

function AdminMobileShellInner({
  locale,
  labels,
  brandName,
  brandMarkUrl,
  adminName,
  adminImage,
  badgeCounts,
  children
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const section = search.get("section") ?? "dashboard";
  const activeTab = tabForSection(section);
  const subNav = subNavForTab(activeTab, labels.items);
  const titleKey = SECTION_TITLE_KEY[section] ?? "dashboard";
  const pageTitle = labels.items[titleKey];

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => document.body.classList.toggle("admin-mobile-app", mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => {
      document.body.classList.remove("admin-mobile-app");
      mq.removeEventListener("change", apply);
    };
  }, []);

  const navigateSection = (nextSection: string) => {
    const params = new URLSearchParams(search.toString());
    params.set("section", nextSection);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const navigateTab = (tab: AdminMobileTab) => {
    if (tab === "menu") {
      setDrawerOpen(true);
      return;
    }
    setDrawerOpen(false);
    navigateSection(defaultSectionForTab(tab));
  };

  return (
    <div className="admin-mobile-layout lg:contents">
      <AdminMobileHeader
        locale={locale}
        title={pageTitle}
        brandName={brandName}
        brandMarkUrl={brandMarkUrl}
        unreadCount={badgeCounts.unreadNotifications}
        adminName={adminName}
        adminImage={adminImage}
      />

      {subNav.length > 1 ? (
        <AdminMobileSubNav items={subNav} activeSection={section} onSelect={navigateSection} />
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

      <AdminMobileBottomNav
        activeTab={activeTab}
        labels={labels.tabs}
        onTabChange={navigateTab}
        drawerOpen={drawerOpen}
      />

      <AdminMobileDrawer
        locale={locale}
        labels={labels}
        adminName={adminName}
        adminImage={adminImage}
        items={labels.items}
        activeSection={section}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigateSection}
      />
    </div>
  );
}

export function AdminMobileShell(props: Props) {
  return (
    <Suspense fallback={<div className="admin-mobile-layout lg:contents">{props.children}</div>}>
      <AdminMobileShellInner {...props} />
    </Suspense>
  );
}
