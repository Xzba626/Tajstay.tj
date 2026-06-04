"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { AdminMobileShellLabels } from "@/components/admin/mobile/AdminMobileShell";

type DrawerItem = { section: string; label: string };

type Props = {
  locale: Locale;
  labels: AdminMobileShellLabels;
  adminName: string;
  adminImage: string | null;
  items: AdminMobileShellLabels["items"];
  activeSection: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
};

function buildDrawerItems(items: Props["items"]): DrawerItem[] {
  return [
    { section: "dashboard", label: items.dashboard },
    { section: "hotels", label: items.hotels },
    { section: "applications", label: items.applications },
    { section: "bookings", label: items.bookings },
    { section: "users", label: items.users },
    { section: "owner-access", label: items.ownerAccess },
    { section: "finance", label: items.finance },
    { section: "complaints", label: items.complaints },
    { section: "notifications", label: items.notifications },
    { section: "content", label: items.content }
  ];
}

export function AdminMobileDrawer({
  locale,
  labels,
  adminName,
  adminImage,
  items,
  activeSection,
  open,
  onClose,
  onNavigate
}: Props) {
  const drawerItems = buildDrawerItems(items);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="admin-mobile-drawer__overlay"
            aria-label={m(locale, "admin.cancel")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="admin-mobile-drawer admin-mobile-drawer--right"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="x"
            dragConstraints={{ left: 0, right: 320 }}
            dragElastic={0.05}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80) onClose();
            }}
          >
            <div className="admin-mobile-drawer__head admin-mobile-drawer__head--close-only">
              <button type="button" className="admin-mobile-header__icon-btn" onClick={onClose} aria-label={m(locale, "admin.cancel")}>
                <X size={22} aria-hidden />
              </button>
            </div>

            <div className="admin-mobile-drawer__profile">
              <ProfileAvatar name={adminName} imageUrl={adminImage} size="md" />
              <div>
                <div className="admin-mobile-drawer__name">{adminName}</div>
                <div className="admin-mobile-drawer__role">{labels.drawerTitle}</div>
              </div>
            </div>

            <nav className="admin-mobile-drawer__nav">
              {drawerItems.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  className={`admin-mobile-drawer__link${activeSection === item.section ? " is-active" : ""}`}
                  onClick={() => {
                    onNavigate(item.section);
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
