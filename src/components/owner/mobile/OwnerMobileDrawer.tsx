"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { OwnerMobileShellLabels } from "@/components/owner/mobile/OwnerMobileShell";

type Props = {
  locale: Locale;
  labels: OwnerMobileShellLabels;
  ownerName: string;
  ownerImage: string | null;
  activeSection: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
};

export function OwnerMobileDrawer({
  locale,
  labels,
  ownerName,
  ownerImage,
  activeSection,
  open,
  onClose,
  onNavigate
}: Props) {
  const items = [
    { section: "overview", label: labels.items.overview },
    { section: "properties", label: labels.items.properties },
    { section: "rooms", label: labels.items.rooms },
    { section: "personnel", label: labels.items.personnel },
    { section: "bookings", label: labels.items.bookings },
    { section: "offline-bookings", label: labels.items.offlineBookings },
    { section: "calendar", label: labels.items.calendar },
    { href: "/dashboard/messages", label: labels.items.messages },
    { section: "finances", label: labels.items.finances },
    { section: "statistics", label: labels.items.statistics },
    { section: "reviews", label: labels.items.reviews },
    { section: "notifications", label: labels.items.notifications },
    { section: "help", label: labels.items.help }
  ];

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
              <ProfileAvatar name={ownerName} imageUrl={ownerImage} size="md" />
              <div>
                <div className="admin-mobile-drawer__name">{ownerName}</div>
                <div className="admin-mobile-drawer__role">{labels.drawerTitle}</div>
              </div>
            </div>

            <nav className="admin-mobile-drawer__nav">
              {items.map((item) =>
                "href" in item && item.href ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="admin-mobile-drawer__link"
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.section}
                    type="button"
                    className={`admin-mobile-drawer__link${activeSection === item.section ? " is-active" : ""}`}
                    onClick={() => {
                      onNavigate(item.section!);
                      onClose();
                    }}
                  >
                    {item.label}
                  </button>
                )
              )}
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
